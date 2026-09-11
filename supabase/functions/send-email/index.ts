import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Brand colours & shared styles ─────────────────────────────────────────
const BRAND = "#7C3AED";
const BRAND_DARK = "#4F46E5";
const BRAND_LIGHT = "#EDE9FE";
const APP_URL = Deno.env.get("APP_URL") || "https://www.nexgenu.cyou";

// ── Shared email wrapper ──────────────────────────────────────────────────
function buildEmail(
  subject: string,
  headerBg: string,
  headerTitle: string,
  headerSubtitle: string,
  body: string,
  ctaText?: string,
  ctaUrl?: string,
  footer?: string,
  unsubToken?: string
) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Inter,'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:${headerBg};padding:36px 40px;text-align:center;">
          <h1 style="margin:0 0 4px;color:#fff;font-size:26px;font-weight:700;">✦ StudyFlow</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.95);font-size:16px;font-weight:600;">${headerTitle}</p>
          ${headerSubtitle ? `<p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">${headerSubtitle}</p>` : ""}
        </td></tr>
        <tr><td style="padding:40px;color:#1a1a2e;">
          <div style="font-size:16px;line-height:1.75;color:#333;">${body}</div>
          ${ctaText && ctaUrl ? `<div style="text-align:center;margin:32px 0;"><a href="${ctaUrl}" style="background:#6c47ff;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block;">${ctaText}</a></div>` : ""}
        </td></tr>
        <tr><td style="background:#f9f9fb;border-top:1px solid #e8e8ef;padding:24px 40px;text-align:center;">
          <p style="margin:0;font-size:13px;color:#888;">${footer ?? "© 2026 StudyFlow · Helping students learn smarter"}</p>
          <p style="margin:6px 0 0;font-size:12px;color:#aaa;">You received this because you have a StudyFlow account.</p>
          ${unsubToken ? `<p style="margin:8px 0 0;font-size:12px;"><a href="${APP_URL}/unsubscribe?token=${unsubToken}" style="color:${BRAND};text-decoration:underline;">Unsubscribe from these emails</a></p>` : ""}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Default templates (shared with Admin dashboard) ──────────────────────
const DEFAULT_TEMPLATES: Record<string, {
  label: string;
  headerBg: string;
  headerTitle: string;
  headerSubtitle: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
}> = {
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
    ctaUrl: `${APP_URL}/dashboard`,
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
    ctaUrl: `${APP_URL}/community`,
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
    ctaUrl: `${APP_URL}/settings`,
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
    ctaUrl: `${APP_URL}/dashboard`,
  },
  upgradeRejected: {
    label: "❌ Upgrade Rejected",
    headerBg: "linear-gradient(135deg,#64748b 0%,#94a3b8 100%)",
    headerTitle: "Upgrade Request Update",
    headerSubtitle: "We reviewed your request",
    body: `<p>Hi <strong>{{name}}</strong>,</p>
<p>After reviewing your upgrade request for <strong>{{tier}} Plan</strong>, we were unable to process it at this time.</p>
{{note_section}}
<p>If you believe this is a mistake, please contact us or try again.</p>`,
    ctaText: "Contact Support",
    ctaUrl: "mailto:info.studyflow001@gmail.com",
  },
};

// ── Curated tip bank ───────────────────────────────────────────────────────
const TIPS = [
  { title: "📚 Study Tip", body: "Try the Pomodoro technique — 25 min focused study, 5 min break. Short breaks improve retention by up to 40%." },
  { title: "📚 Study Tip", body: "Active recall beats re-reading. Close your notes and write down everything you remember. Struggling to recall is what builds memory." },
  { title: "📚 Study Tip", body: "Spaced repetition: review material after 1 day, then 3 days, then 1 week. Your brain retains information much longer this way." },
  { title: "📚 Study Tip", body: "Teach what you've just learned out loud. The 'protégé effect' is one of the fastest ways to solidify knowledge." },
  { title: "📚 Study Tip", body: "Study the hardest subject first when your mental energy is highest — usually in the morning or after a good rest." },
  { title: "💡 StudyFlow Tip", body: "Upload your lecture slides to the AI Tutor and ask it to summarise the key points in under 200 words." },
  { title: "💡 StudyFlow Tip", body: "After uploading a document, ask the AI Tutor: 'What are the 5 most important concepts from this?' — it gives a focused breakdown." },
  { title: "💡 StudyFlow Tip", body: "Use the Quiz feature right before an exam with shuffle mode so you can't memorise the order of answers." },
  { title: "🧠 Mindset Tip", body: "Sleep is when your brain consolidates memories. Reviewing material before bed and getting 7–9 hours can improve retention by up to 40%." },
  { title: "🧠 Mindset Tip", body: "Progress, not perfection. Missing one study session doesn't ruin your preparation — consistency over weeks matters far more." },
];

function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Main handler ───────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");
    const resendKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    const { type, userId, to, data } = body;

    // ── Helper: send via Google SMTP (primary) or Resend (fallback) ─────────
    const sendEmail = async (recipient: string, subject: string, html: string, text?: string) => {
      const plainText = text || htmlToPlainText(html);

      // 1. Google SMTP via Nodemailer
      if (gmailUser && gmailAppPassword) {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: gmailUser,
            pass: gmailAppPassword,
          },
        });

        const info = await transporter.sendMail({
          from: `StudyFlow <${gmailUser}>`,
          replyTo: gmailUser,
          to: recipient,
          subject,
          text: plainText,
          html,
          headers: {
            "X-Auto-Response-Suppress": "OOF, AutoReply",
          },
        });
        console.log(`[Google SMTP] Sent email "${subject}" to ${recipient} (messageId: ${info.messageId})`);
        return { ok: true, provider: "google-smtp", messageId: info.messageId };
      }

      // 2. Resend fallback
      if (resendKey) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "StudyFlow <onboarding@resend.dev>",
            to: recipient,
            subject,
            html,
            text: plainText,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(`Resend error: ${JSON.stringify(err)}`);
        }
        return res.json();
      }

      throw new Error("No email provider configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in Supabase Secrets.");
    };

    // ── Helper: get profile + check opt-out ────────────────────────────────
    const getProfile = async (uid: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, email, email_opt_out, university, course_of_study, level")
        .eq("id", uid)
        .single();
      return profile;
    };

    const getUnsubToken = (uid: string) =>
      btoa(`${uid}:${Deno.env.get("SUPABASE_JWT_SECRET") ?? "unsub"}`);

    // ── Helper: load template from DB or fallback ─────────────────────────
    const loadTemplate = async (templateKey: string) => {
      try {
        const { data: dbTmpl } = await supabase
          .from("email_templates")
          .select("*")
          .eq("id", templateKey)
          .maybeSingle();

        if (dbTmpl) {
          return {
            label: dbTmpl.label,
            headerBg: dbTmpl.header_bg,
            headerTitle: dbTmpl.header_title,
            headerSubtitle: dbTmpl.header_subtitle,
            body: dbTmpl.body,
            ctaText: dbTmpl.cta_text,
            ctaUrl: dbTmpl.cta_url,
          };
        }
      } catch (_e) {
        // Table may not exist yet, proceed with default
      }
      return DEFAULT_TEMPLATES[templateKey] || DEFAULT_TEMPLATES.welcome;
    };

    // ── Route by type ──────────────────────────────────────────────────────
    let result: any = {};
    const normalizedType = String(type || "").toLowerCase().replace(/[-_]/g, "");

    if (normalizedType === "welcome") {
      // 1. Welcome Email
      const profile = await getProfile(userId);
      if (!profile?.email || profile.email_opt_out) {
        return new Response(JSON.stringify({ skipped: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const name = profile.full_name?.split(" ")[0] || "there";
      const tmpl = await loadTemplate("welcome");
      const renderedBody = tmpl.body.replace(/\{\{name\}\}/g, name);
      const renderedSubtitle = (tmpl.headerSubtitle || "").replace(/\{\{name\}\}/g, name);
      const html = buildEmail(tmpl.headerTitle, tmpl.headerBg, tmpl.headerTitle, renderedSubtitle, renderedBody, tmpl.ctaText, tmpl.ctaUrl, undefined, getUnsubToken(userId));
      result = await sendEmail(profile.email, `Welcome to StudyFlow, ${name}! 🎓`, html);

    } else if (normalizedType === "upgraderequest") {
      // 2. Upgrade Request Received
      const profile = await getProfile(userId);
      if (!profile?.email) throw new Error("User profile or email not found");
      const name = profile.full_name?.split(" ")[0] || "there";
      const tier = data?.tier || "Pro";
      const amount = data?.amount || "1,500";
      const reference = data?.reference || "Bank Transfer";

      const tmpl = await loadTemplate("upgradeRequest");
      const renderedBody = tmpl.body
        .replace(/\{\{name\}\}/g, name)
        .replace(/\{\{tier\}\}/g, tier)
        .replace(/\{\{amount\}\}/g, amount)
        .replace(/\{\{reference\}\}/g, reference);
      const renderedTitle = tmpl.headerTitle.replace(/\{\{tier\}\}/g, tier);
      const renderedSubtitle = (tmpl.headerSubtitle || "")
        .replace(/\{\{tier\}\}/g, tier)
        .replace(/\{\{amount\}\}/g, amount);

      const html = buildEmail(
        renderedTitle,
        tmpl.headerBg,
        renderedTitle,
        renderedSubtitle,
        renderedBody,
        tmpl.ctaText,
        tmpl.ctaUrl
      );
      result = await sendEmail(profile.email, `⏳ Upgrade Request Received — ${tier} Plan`, html);

      // Also notify admin if gmailUser is set
      if (gmailUser && gmailUser !== profile.email) {
        try {
          const adminHtml = buildEmail(
            `New Upgrade Request: ${tier} Plan`,
            "linear-gradient(135deg,#f59e0b 0%,#fcd34d 100%)",
            "New Upgrade Payment Submitted",
            `${name} · ${profile.email}`,
            `<p>Student <strong>${profile.full_name || name}</strong> (${profile.email}) has submitted an upgrade request for <strong>${tier} Plan (₦${amount})</strong>.</p>
             <p>Payment Reference: <strong>${reference}</strong></p>
             <p>Please review and approve the request in the Admin dashboard.</p>`,
            "Review in Admin Dashboard",
            `${APP_URL}/admin`
          );
          await sendEmail(gmailUser, `[StudyFlow Admin] New Upgrade Request from ${name} (${tier})`, adminHtml);
        } catch (adminErr) {
          console.warn("Failed to notify admin of upgrade request:", adminErr);
        }
      }

    } else if (normalizedType === "upgradeapproved") {
      // 3. Upgrade Approved
      const profile = await getProfile(userId);
      if (!profile?.email) throw new Error("User profile or email not found");
      const name = profile.full_name?.split(" ")[0] || "there";
      const tier = data?.tier || "Pro";

      const tmpl = await loadTemplate("upgradeApproved");
      const renderedBody = tmpl.body
        .replace(/\{\{name\}\}/g, name)
        .replace(/\{\{tier\}\}/g, tier);
      const renderedTitle = tmpl.headerTitle.replace(/\{\{tier\}\}/g, tier);
      const renderedSubtitle = (tmpl.headerSubtitle || "").replace(/\{\{tier\}\}/g, tier);

      const html = buildEmail(
        renderedTitle,
        tmpl.headerBg,
        renderedTitle,
        renderedSubtitle,
        renderedBody,
        tmpl.ctaText,
        tmpl.ctaUrl
      );
      result = await sendEmail(profile.email, `🎉 Your StudyFlow account is now on ${tier}!`, html);

    } else if (normalizedType === "upgraderejected") {
      // 4. Upgrade Rejected
      const profile = await getProfile(userId);
      if (!profile?.email) throw new Error("User profile or email not found");
      const name = profile.full_name?.split(" ")[0] || "there";
      const tier = data?.tier || "Pro";
      const note = data?.reason || data?.note || "";
      const noteSection = note
        ? `<div style="background:#fee2e2;border-left:4px solid #ef4444;padding:12px 16px;border-radius:6px;margin:16px 0;color:#991b1b;font-size:14px;"><strong>Note from Admin:</strong> ${note}</div>`
        : "";

      const tmpl = await loadTemplate("upgradeRejected");
      const renderedBody = tmpl.body
        .replace(/\{\{name\}\}/g, name)
        .replace(/\{\{tier\}\}/g, tier)
        .replace(/\{\{note_section\}\}/g, noteSection);
      const renderedTitle = tmpl.headerTitle;
      const renderedSubtitle = tmpl.headerSubtitle;

      const html = buildEmail(
        renderedTitle,
        tmpl.headerBg,
        renderedTitle,
        renderedSubtitle,
        renderedBody,
        tmpl.ctaText,
        tmpl.ctaUrl
      );
      result = await sendEmail(profile.email, `StudyFlow Upgrade Request Update (${tier})`, html);

    } else if (normalizedType === "studygroup") {
      // 5. Study Community Group Joined
      const profile = await getProfile(userId);
      if (!profile?.email || profile.email_opt_out) {
        return new Response(JSON.stringify({ skipped: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const name = profile.full_name?.split(" ")[0] || "there";
      const course = data?.course || profile.course_of_study || "your course";
      const level = data?.level || profile.level || "";
      const university = data?.university || profile.university || "your university";

      const tmpl = await loadTemplate("studyGroup");
      const renderedBody = tmpl.body
        .replace(/\{\{name\}\}/g, name)
        .replace(/\{\{course\}\}/g, course)
        .replace(/\{\{level\}\}/g, level)
        .replace(/\{\{university\}\}/g, university);
      const renderedSubtitle = (tmpl.headerSubtitle || "")
        .replace(/\{\{course\}\}/g, course)
        .replace(/\{\{level\}\}/g, level)
        .replace(/\{\{university\}\}/g, university);

      const html = buildEmail(
        tmpl.headerTitle,
        tmpl.headerBg,
        tmpl.headerTitle,
        renderedSubtitle,
        renderedBody,
        tmpl.ctaText,
        tmpl.ctaUrl,
        undefined,
        getUnsubToken(userId)
      );
      result = await sendEmail(profile.email, `📚 Welcome to your Study Community group!`, html);

    } else if (normalizedType === "broadcast") {
      // 6. Admin Broadcast to all active users
      const { subject, message, wrap = true, headerTitle = "StudyFlow Announcement" } = data ?? {};
      if (!subject || !message) throw new Error("broadcast requires data.subject and data.message");

      const { data: users } = await supabase
        .from("profiles")
        .select("id, full_name, email, email_opt_out")
        .eq("email_opt_out", false)
        .not("email", "is", null);

      let sent = 0;
      let failed = 0;
      for (const u of users ?? []) {
        const name = u.full_name?.split(" ")[0] || "there";
        const unsubToken = getUnsubToken(u.id);
        const personalised = message.replace(/\{\{name\}\}/g, name);
        const html = wrap
          ? buildEmail(subject, "linear-gradient(135deg,#6c47ff 0%,#a78bfa 100%)", headerTitle, "", personalised, "Open StudyFlow", `${APP_URL}/dashboard`, undefined, unsubToken)
          : personalised;

        try {
          await sendEmail(u.email!, subject, html);
          sent++;
        } catch (e) {
          console.error(`Failed to send broadcast to ${u.email}:`, e);
          failed++;
        }
      }
      result = { sent, failed, total: (users ?? []).length };

    } else if (normalizedType === "single") {
      // 7. Single direct message
      if (!to) throw new Error("Missing 'to' for single email");
      const { subject, html, text } = data ?? {};
      result = await sendEmail(to, subject, html, text);

    } else if (normalizedType === "reminder") {
      // 8. Inactivity Streak Reminder (pg_cron)
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data: inactiveUsers } = await supabase
        .from("profiles")
        .select("id, full_name, email, email_opt_out")
        .eq("email_opt_out", false)
        .not("email", "is", null);

      let sent = 0;
      for (const u of inactiveUsers ?? []) {
        const { count: quizCount } = await supabase
          .from("quiz_sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", u.id)
          .gte("created_at", threeDaysAgo);

        const { count: flashCount } = await supabase
          .from("flashcards")
          .select("id", { count: "exact", head: true })
          .eq("user_id", u.id)
          .gte("created_at", threeDaysAgo);

        if ((quizCount ?? 0) > 0 || (flashCount ?? 0) > 0) continue;

        const name = u.full_name?.split(" ")[0] || "there";
        const bodyText = `
          <h1 style="color:#1F1B4B;font-size:24px;font-weight:800;margin:0 0 8px;">Don't let your streak fade, ${name}! 👀</h1>
          <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
            Consistency is what separates good students from great ones. Even a 15-minute study session today will keep your memory sharp.
          </p>
          <div style="background:${BRAND_LIGHT};border-radius:12px;padding:20px 24px;margin:0 0 24px;border-left:4px solid ${BRAND};">
            <p style="color:${BRAND};font-weight:700;font-size:14px;margin:0 0 6px;">💡 Quick study idea:</p>
            <p style="color:#4B5563;font-size:14px;margin:0;">
              Open a document you uploaded recently, ask the AI Tutor to quiz you on 5 questions, then review your flashcards for 10 minutes. Done!
            </p>
          </div>
        `;
        const html = buildEmail(`${name}, don't let your streak fade 📚`, "linear-gradient(135deg,#7C3AED 0%,#4F46E5 100%)", "Study Streak Reminder", "", bodyText, "Resume Studying →", `${APP_URL}/tutor`, undefined, getUnsubToken(u.id));
        await sendEmail(u.email!, `${name}, don't let your streak fade 📚`, html);
        sent++;
      }
      result = { sent };

    } else if (normalizedType === "tipfallback") {
      // 9. Study tip fallback for users without push tokens
      const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, email_opt_out")
        .eq("email_opt_out", false)
        .not("email", "is", null);

      const { data: pushUsers } = await supabase.from("push_tokens").select("user_id");
      const pushedIds = new Set((pushUsers ?? []).map((r: any) => r.user_id));

      let sent = 0;
      for (const u of allProfiles ?? []) {
        if (pushedIds.has(u.id)) continue;
        const name = u.full_name?.split(" ")[0] || "there";
        const bodyText = `
          <h1 style="color:#1F1B4B;font-size:22px;font-weight:800;margin:0 0 8px;">Hi ${name}! Here's today's tip 💡</h1>
          <div style="background:${BRAND_LIGHT};border-radius:14px;padding:24px;margin:16px 0 24px;border-left:4px solid ${BRAND};">
            <p style="color:${BRAND};font-weight:700;font-size:15px;margin:0 0 10px;">${tip.title}</p>
            <p style="color:#374151;font-size:15px;line-height:1.7;margin:0;">${tip.body}</p>
          </div>
          <p style="color:#6B7280;font-size:13px;text-align:center;margin:0 0 20px;">
            Enable push notifications in the app to get these tips instantly!
          </p>
        `;
        const html = buildEmail(`${tip.title} — today's tip`, "linear-gradient(135deg,#7C3AED 0%,#4F46E5 100%)", "Daily Study Tip", "", bodyText, "Open StudyFlow →", `${APP_URL}/dashboard`, undefined, getUnsubToken(u.id));
        await sendEmail(u.email!, `${tip.title} — today's tip from StudyFlow`, html);
        sent++;
      }
      result = { sent, tip: tip.title };

    } else {
      throw new Error(`Unknown email type: ${type}`);
    }

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-email error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
