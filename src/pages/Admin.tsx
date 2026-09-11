import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Shield, CheckCircle2, XCircle, Loader2, Receipt, ExternalLink,
  Users, FileText, MessageSquare, Mail, Eye, EyeOff, Send,
  BookOpen, TrendingUp, Activity, Edit3, Save, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { UpgradeRequestStatus } from "@/components/UpgradeDialog";

interface AdminUpgradeRequest {
  id: string;
  user_id: string;
  requested_tier: string;
  amount: number;
  payment_reference: string | null;
  receipt_url: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

// ─── Email builder (shared with edge function) ──────────────────────────────
function buildEmail(
  subject: string, headerBg: string, headerTitle: string, headerSubtitle: string,
  body: string, ctaText?: string, ctaUrl?: string, footer?: string
) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Inter,'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:${headerBg};padding:36px 40px;text-align:center;">
          <h1 style="margin:0 0 4px;color:#fff;font-size:26px;font-weight:700;">✦ StudyFlow</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.9);font-size:16px;font-weight:600;">${headerTitle}</p>
          ${headerSubtitle ? `<p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:14px;">${headerSubtitle}</p>` : ""}
        </td></tr>
        <tr><td style="padding:40px;color:#1a1a2e;">
          <div style="font-size:16px;line-height:1.75;color:#333;">${body}</div>
          ${ctaText && ctaUrl ? `<div style="text-align:center;margin:32px 0;"><a href="${ctaUrl}" style="background:#6c47ff;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block;">${ctaText}</a></div>` : ""}
        </td></tr>
        <tr><td style="background:#f9f9fb;border-top:1px solid #e8e8ef;padding:24px 40px;text-align:center;">
          <p style="margin:0;font-size:13px;color:#888;">${footer ?? "© 2025 StudyFlow · Helping students learn smarter"}</p>
          <p style="margin:6px 0 0;font-size:12px;color:#aaa;">You received this because you have a StudyFlow account.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const DEFAULT_TEMPLATES = {
  welcome: {
    label: "🎉 Welcome Email",
    headerBg: "linear-gradient(135deg,#6c47ff 0%,#a78bfa 100%)",
    headerTitle: "Welcome to StudyFlow! 🎊",
    headerSubtitle: "Your journey to smarter studying starts now",
    body: `<p>Hi <strong>{{name}}</strong>,</p>
<p>We're so excited to have you on board! StudyFlow is your all-in-one study companion — from AI-powered tutoring and smart flashcards to community study groups and quizzes.</p>
<ul style="padding-left:20px;color:#555;">
  <li style="margin-bottom:8px;">Set your university and course to join your study community</li>
  <li style="margin-bottom:8px;">Create AI-powered flashcards from any document</li>
  <li style="margin-bottom:8px;">Chat with your AI tutor anytime</li>
  <li style="margin-bottom:8px;">Track your study streaks on the leaderboard</li>
</ul>
<p>Let's get you started!</p>`,
    ctaText: "Go to StudyFlow",
    ctaUrl: "https://www.nexgenu.cyou",
  },
  studyGroup: {
    label: "📚 Study Group Joined",
    headerBg: "linear-gradient(135deg,#059669 0%,#34d399 100%)",
    headerTitle: "Study Community Joined! 📚",
    headerSubtitle: "{{course}} · {{level}} · {{university}}",
    body: `<p>Hi <strong>{{name}}</strong>,</p>
<p>Great news! You've been automatically added to your <strong>{{course}} — {{level}}</strong> community group at <strong>{{university}}</strong>.</p>
<ul style="padding-left:20px;color:#555;">
  <li style="margin-bottom:8px;">Post questions and discussions in your community feed</li>
  <li style="margin-bottom:8px;">See posts from classmates in the same course and level</li>
  <li style="margin-bottom:8px;">Share notes, resources and study tips</li>
</ul>
<p>Head to the Community tab to start connecting!</p>`,
    ctaText: "Open Community",
    ctaUrl: "https://www.nexgenu.cyou/community",
  },
  upgradeRequest: {
    label: "⏳ Upgrade Request Received",
    headerBg: "linear-gradient(135deg,#f59e0b 0%,#fcd34d 100%)",
    headerTitle: "Upgrade Request Received ⏳",
    headerSubtitle: "{{tier}} Plan · ₦{{amount}}",
    body: `<p>Hi <strong>{{name}}</strong>,</p>
<p>We've received your request to upgrade to the <strong>{{tier}} Plan</strong>.</p>
<p>Our team will review your payment and activate your plan within <strong>24 hours</strong>. You'll receive a confirmation email once it's done.</p>
<p>If you have any questions, feel free to reach out to us.</p>
<p style="color:#888;font-size:14px;">Reference: {{reference}}</p>`,
    ctaText: "Go to Settings",
    ctaUrl: "https://www.nexgenu.cyou/settings",
  },
  upgradeApproved: {
    label: "✅ Upgrade Approved",
    headerBg: "linear-gradient(135deg,#6c47ff 0%,#a78bfa 100%)",
    headerTitle: "🎉 You're now on {{tier}}!",
    headerSubtitle: "Enjoy your new features",
    body: `<p>Hi <strong>{{name}}</strong>,</p>
<p>Your subscription has been upgraded to the <strong>{{tier}} Plan</strong>! Your new features are now active.</p>
<p>Enjoy everything StudyFlow has to offer. Thank you for supporting us! 🙏</p>`,
    ctaText: "Explore New Features",
    ctaUrl: "https://www.nexgenu.cyou",
  },
  upgradeRejected: {
    label: "❌ Upgrade Rejected",
    headerBg: "linear-gradient(135deg,#64748b 0%,#94a3b8 100%)",
    headerTitle: "Upgrade Request Update",
    headerSubtitle: "We reviewed your request",
    body: `<p>Hi <strong>{{name}}</strong>,</p>
<p>After reviewing your upgrade request, we were unable to process it at this time.</p>
<p>If you believe this is a mistake, please contact us or try again.</p>`,
    ctaText: "Contact Support",
    ctaUrl: "mailto:info.studyflow001@gmail.com",
  },
};

const Admin = () => {
  const { user } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  // Newsletter state
  const [nlSubject, setNlSubject] = useState("");
  const [nlHeader, setNlHeader] = useState("");
  const [nlBody, setNlBody] = useState("");
  const [nlCtaText, setNlCtaText] = useState("");
  const [nlCtaUrl, setNlCtaUrl] = useState("");
  const [nlFooter, setNlFooter] = useState("");
  const [nlPreview, setNlPreview] = useState(false);
  const [nlSending, setNlSending] = useState(false);

  // Email templates — load from DB, fall back to defaults
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [savingTemplate, setSavingTemplate] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);

  useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("email_templates" as any)
        .select("*") as any);
      if (error) throw error;
      if (data && data.length > 0) {
        const mapped: any = { ...DEFAULT_TEMPLATES };
        for (const row of data) {
          mapped[row.id] = {
            label: row.label,
            headerBg: row.header_bg,
            headerTitle: row.header_title,
            headerSubtitle: row.header_subtitle,
            body: row.body,
            ctaText: row.cta_text,
            ctaUrl: row.cta_url,
          };
        }
        setTemplates(mapped);
      }
      return data;
    },
    enabled: !!isAdmin,
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin-upgrade-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("upgrade_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) as AdminUpgradeRequest[];
    },
    enabled: !!isAdmin,
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, flashcards, posts, newUsers] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("flashcards").select("*", { count: "exact", head: true }),
        supabase.from("community_posts").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);
      return {
        users: users.count || 0,
        flashcards: flashcards.count || 0,
        posts: posts.count || 0,
        newUsers: newUsers.count || 0,
      };
    },
    enabled: !!isAdmin,
  });

  const handleAction = async (requestId: string, action: "approved" | "rejected") => {
    if (!user) return;
    setProcessingId(requestId);
    try {
      const request = requests.find((r) => r.id === requestId);
      if (!request) return;

      const { error: updateError } = await supabase
        .from("upgrade_requests")
        .update({
          status: action,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          admin_note: adminNotes[requestId] || null,
        } as any)
        .eq("id", requestId);

      if (updateError) throw updateError;

      if (action === "approved") {
        const storageLimit = request.requested_tier === "premium" ? 300 * 1024 * 1024 : 200 * 1024 * 1024;
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ subscription_tier: request.requested_tier, storage_limit_bytes: storageLimit } as any)
          .eq("id", request.user_id);
        if (profileError) throw profileError;

        // Automatically send celebration email to student
        supabase.functions.invoke("send-email", {
          body: {
            type: "upgradeApproved",
            userId: request.user_id,
            data: {
              tier: request.requested_tier === "premium" ? "Premium" : "Pro",
            },
          },
        }).catch((err) => console.warn("Failed to send approval email:", err));
      } else if (action === "rejected") {
        // Automatically send rejection notice email to student
        supabase.functions.invoke("send-email", {
          body: {
            type: "upgradeRejected",
            userId: request.user_id,
            data: {
              tier: request.requested_tier === "premium" ? "Premium" : "Pro",
              reason: adminNotes[requestId] || "",
            },
          },
        }).catch((err) => console.warn("Failed to send rejection email:", err));
      }

      toast({ title: `Request ${action}`, description: `The upgrade request has been ${action} and email notification sent.` });
      queryClient.invalidateQueries({ queryKey: ["admin-upgrade-requests"] });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const getReceiptUrl = (path: string) => {
    const { data } = supabase.storage.from("receipts").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSendNewsletter = async () => {
    if (!nlSubject.trim() || !nlBody.trim()) {
      toast({ title: "Missing fields", description: "Subject and message body are required.", variant: "destructive" });
      return;
    }
    setNlSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          type: "broadcast",
          data: {
            subject: nlSubject.trim(),
            message: `<p style="white-space:pre-wrap;">${nlBody.trim()}</p>`,
            wrap: true,
          },
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      const { sent = 0, failed = 0, total = 0 } = data ?? {};
      toast({
        title: "Broadcast sent! 🎉",
        description: `Delivered to ${sent} of ${total} users${failed > 0 ? ` (${failed} failed)` : ""}.`,
      });
      setNlSubject(""); setNlBody(""); setNlPreview(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setNlSending(false);
    }
  };

  const updateTemplateField = (key: string, field: string, value: string) => {
    setTemplates((prev: any) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const handleSaveTemplate = async (key: string) => {
    setSavingTemplate(key);
    try {
      const t = templates[key as keyof typeof templates];
      const { error } = await supabase
        .from("email_templates" as any)
        .upsert({
          id: key,
          label: t.label,
          header_bg: t.headerBg,
          header_title: t.headerTitle,
          header_subtitle: t.headerSubtitle,
          body: t.body,
          cta_text: t.ctaText,
          cta_url: t.ctaUrl,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      toast({ title: "Template saved!", description: `${t.label} has been updated.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingTemplate(null);
    }
  };

  const buildPreviewForTemplate = (key: string) => {
    const t = templates[key as keyof typeof templates];
    const sampleBody = t.body
      .replace(/{{name}}/g, "Alex Johnson")
      .replace(/{{course}}/g, "Computer Science")
      .replace(/{{level}}/g, "300 Level")
      .replace(/{{university}}/g, "University of Lagos")
      .replace(/{{tier}}/g, "Pro")
      .replace(/{{amount}}/g, "5,000")
      .replace(/{{reference}}/g, "PAY-123456");
    const subtitle = t.headerSubtitle
      .replace(/{{course}}/g, "Computer Science")
      .replace(/{{level}}/g, "300 Level")
      .replace(/{{university}}/g, "University of Lagos")
      .replace(/{{tier}}/g, "Pro")
      .replace(/{{amount}}/g, "5,000");
    const title = t.headerTitle.replace(/{{tier}}/g, "Pro");
    return buildEmail(t.label, t.headerBg, title, subtitle, sampleBody, t.ctaText, t.ctaUrl);
  };

  if (adminLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
        </div>
      </DashboardLayout>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const processedRequests = requests.filter((r) => r.status !== "pending");

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-4xl pb-24 md:pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Admin Panel</h1>
          </div>
          <p className="text-muted-foreground mt-1">Manage users, upgrade requests, emails and system stats.</p>
        </motion.div>

        {/* ── Stats Grid ──────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Platform Overview
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
                          { label: "Total Users", value: stats?.users, icon: Users, color: "text-primary", bg: "bg-primary/10" },
              { label: "New (7 days)", value: stats?.newUsers, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
              { label: "Community Posts", value: stats?.posts, icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-500/10" },
              { label: "Flashcards", value: stats?.flashcards, icon: BookOpen, color: "text-violet-500", bg: "bg-violet-500/10" },
              { label: "Pending Requests", value: pendingRequests.length, icon: Shield, color: "text-rose-500", bg: "bg-rose-500/10" },
            ].map((s) => (
              <div key={s.label} className="bg-card/60 backdrop-blur-xl rounded-xl p-4 border border-border/50 flex items-center gap-3">
                <div className={`w-10 h-10 ${s.bg} rounded-full flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground leading-tight truncate">{s.label}</p>
                  <p className="text-xl font-bold">{s.value ?? "—"}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Email Broadcast ──────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Email Broadcast</h2>
            <Badge variant="outline" className="ml-auto text-xs text-emerald-600 border-emerald-300">Live</Badge>
          </div>
          <Card className="bg-card/60 backdrop-blur-xl border-border/50">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nl-subject">Subject Line</Label>
                <Input
                  id="nl-subject"
                  placeholder="e.g. New features just dropped 🚀"
                  value={nlSubject}
                  onChange={(e) => setNlSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nl-body">
                  Message Body
                  <span className="text-xs text-muted-foreground ml-2 font-normal">
                    Use <code className="bg-muted px-1 rounded">{"{{name}}"}</code> to personalise
                  </span>
                </Label>
                <Textarea
                  id="nl-body"
                  placeholder={`Hi {{name}},\n\nWe just shipped something exciting for you...`}
                  value={nlBody}
                  onChange={(e) => setNlBody(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>

              {/* Preview toggle */}
              {nlBody && (
                <button
                  type="button"
                  onClick={() => setNlPreview((v) => !v)}
                  className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  {nlPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {nlPreview ? "Hide preview" : "Show preview"}
                </button>
              )}

              {nlPreview && nlBody && (
                <div className="rounded-xl border border-border overflow-hidden shadow-inner">
                  <p className="text-xs text-muted-foreground px-3 py-2 border-b border-border bg-muted/40">
                    Email Preview — sample recipient: <strong>Alex Johnson</strong>
                  </p>
                  <iframe
                    title="email-preview"
                    className="w-full"
                    style={{ height: 420, border: "none" }}
                    srcDoc={buildEmail(
                      nlSubject || "(no subject)",
                      "linear-gradient(135deg,#6c47ff 0%,#a78bfa 100%)",
                      "StudyFlow",
                      "",
                      `<p style="white-space:pre-wrap;">${nlBody.replace(/{{name}}/g, "Alex Johnson")}</p>`,
                    )}
                  />
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button
                  id="send-broadcast-btn"
                  onClick={handleSendNewsletter}
                  disabled={nlSending || !nlSubject.trim() || !nlBody.trim()}
                  className="gradient-primary text-primary-foreground"
                >
                  {nlSending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
                  ) : (
                    <><Send className="mr-2 h-4 w-4" /> Send to All Users</>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Skips users who have opted out of emails.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Automated Email Templates ─── DISABLED ──────────────────────── */}

        {/* ── Pending Requests ─────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h2 className="text-lg font-semibold text-foreground mb-4">Pending Requests ({pendingRequests.length})</h2>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : pendingRequests.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No pending requests.</CardContent></Card>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((req) => (
                <Card key={req.id} className="bg-card/60 backdrop-blur-xl border-border/50 hover:shadow-xl transition-shadow">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <p className="text-sm text-muted-foreground">User ID</p>
                        <p className="text-xs font-mono text-foreground">{req.user_id}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="capitalize">{req.requested_tier}</Badge>
                        <p className="text-sm font-semibold text-foreground mt-1">₦{req.amount.toLocaleString()}</p>
                      </div>
                    </div>
                    {req.payment_reference && (
                      <div>
                        <p className="text-sm text-muted-foreground">Reference</p>
                        <p className="text-sm font-mono text-foreground">{req.payment_reference}</p>
                      </div>
                    )}
                    {req.receipt_url && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Receipt</p>
                        <a href={getReceiptUrl(req.receipt_url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                          <Receipt className="w-4 h-4" /> View Receipt <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs">Admin Note (optional)</Label>
                      <Input placeholder="Add a note…" value={adminNotes[req.id] || ""} onChange={(e) => setAdminNotes((prev) => ({ ...prev, [req.id]: e.target.value }))} maxLength={500} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleAction(req.id, "approved")} disabled={processingId === req.id} className="bg-green-600 hover:bg-green-700 text-white">
                        {processingId === req.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleAction(req.id, "rejected")} disabled={processingId === req.id}>
                        <XCircle className="mr-1 h-3 w-3" /> Reject
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Submitted: {new Date(req.created_at).toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Processed Requests ───────────────────────────────────────────── */}
        {processedRequests.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Processed ({processedRequests.length})</h2>
            <div className="space-y-3">
              {processedRequests.map((req) => (
                <Card key={req.id} className="opacity-75">
                  <CardContent className="pt-4 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground">{req.user_id}</p>
                      <Badge variant="secondary" className="capitalize mt-1">{req.requested_tier}</Badge>
                    </div>
                    <div className="text-right">
                      <UpgradeRequestStatus status={req.status} />
                      {req.admin_note && <p className="text-xs text-muted-foreground mt-1">{req.admin_note}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Admin;
