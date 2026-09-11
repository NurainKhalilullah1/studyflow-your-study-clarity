import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Brand colours & shared styles ─────────────────────────────────────────
const BRAND = "#7C3AED";
const BRAND_LIGHT = "#EDE9FE";
const APP_URL = Deno.env.get("APP_URL") || "https://www.nexgenu.cyou";

const emailBase = (preheader: string, body: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>StudyFlow</title>
</head>
<body style="margin:0;padding:0;background:#F5F3FF;font-family:'Segoe UI',Arial,sans-serif;">
  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;">${preheader}&nbsp;</div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3FF;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${BRAND} 0%,#4F46E5 100%);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
            <span style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">📚 StudyFlow</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#fff;padding:40px;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(124,58,237,0.08);">
            ${body}

            <!-- Footer -->
            <hr style="border:none;border-top:1px solid #EDE9FE;margin:32px 0;" />
            <p style="color:#9CA3AF;font-size:12px;text-align:center;margin:0;">
              You received this because you have a StudyFlow account.<br/>
              <a href="${APP_URL}/unsubscribe?token=__UNSUB_TOKEN__" style="color:${BRAND};text-decoration:underline;">Unsubscribe from these emails</a>
              &nbsp;·&nbsp;
              <a href="${APP_URL}" style="color:${BRAND};text-decoration:none;">Open StudyFlow</a>
            </p>
            <p style="color:#9CA3AF;font-size:11px;text-align:center;margin:8px 0 0;">
              &copy; 2026 StudyFlow. All rights reserved. Helping students learn smarter
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ── Templates ──────────────────────────────────────────────────────────────

const templates = {

  welcome: (name: string, unsubToken: string) => ({
    subject: `Welcome to StudyFlow, ${name}! 🎓`,
    html: emailBase(
      `You're all set to study smarter`,
      `
      <h1 style="color:#1F1B4B;font-size:26px;font-weight:800;margin:0 0 8px;">Welcome aboard, ${name}! 🎉</h1>
      <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Your StudyFlow account is ready. You can now study smarter with your personal AI tutor,
        generate flashcards from your notes, and test yourself with custom quizzes.
      </p>

      <div style="background:${BRAND_LIGHT};border-radius:12px;padding:24px;margin:0 0 24px;">
        <p style="color:${BRAND};font-weight:700;font-size:14px;margin:0 0 12px;">🚀 Get started in 3 steps:</p>
        <ol style="color:#4B5563;font-size:14px;line-height:1.8;margin:0;padding-left:20px;">
          <li>Upload a lecture note or document to your library</li>
          <li>Ask the AI Tutor to summarise or quiz you on it</li>
          <li>Review your flashcards anytime, anywhere</li>
        </ol>
      </div>

      <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
        <tr><td style="background:${BRAND};border-radius:10px;padding:14px 32px;">
          <a href="${APP_URL}/dashboard" style="color:#fff;font-weight:700;font-size:15px;text-decoration:none;">
            Go to Dashboard →
          </a>
        </td></tr>
      </table>

      <p style="color:#9CA3AF;font-size:13px;text-align:center;margin:0;">
        Happy studying! The StudyFlow team is rooting for you 💜
      </p>
      `
    ).replace("__UNSUB_TOKEN__", unsubToken),
  }),

  reminder: (name: string, daysSince: number, unsubToken: string) => ({
    subject: `${name}, don't let your streak fade 📚`,
    html: emailBase(
      `It's been ${daysSince} days — come back and study!`,
      `
      <h1 style="color:#1F1B4B;font-size:26px;font-weight:800;margin:0 0 8px;">
        Hey ${name}, it's been ${daysSince} day${daysSince > 1 ? "s" : ""} 👀
      </h1>
      <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Consistency is what separates good students from great ones. 
        Even a 15-minute session today will keep your memory fresh.
      </p>

      <div style="background:${BRAND_LIGHT};border-radius:12px;padding:20px 24px;margin:0 0 24px;border-left:4px solid ${BRAND};">
        <p style="color:${BRAND};font-weight:700;font-size:14px;margin:0 0 6px;">💡 Quick study idea:</p>
        <p style="color:#4B5563;font-size:14px;margin:0;">
          Open a document you uploaded recently, ask the AI Tutor to quiz you on 5 questions, 
          then review your flashcards for 10 minutes. Done!
        </p>
      </div>

      <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
        <tr><td style="background:${BRAND};border-radius:10px;padding:14px 32px;">
          <a href="${APP_URL}/tutor" style="color:#fff;font-weight:700;font-size:15px;text-decoration:none;">
            Resume Studying →
          </a>
        </td></tr>
      </table>
      `
    ).replace("__UNSUB_TOKEN__", unsubToken),
  }),

  weeklySummary: (
    name: string,
    stats: { quizzes: number; flashcards: number; documents: number; xp: number },
    unsubToken: string
  ) => ({
    subject: `Your week in review, ${name} 📊`,
    html: emailBase(
      `${stats.quizzes} quizzes, ${stats.flashcards} flashcards — here's your weekly recap`,
      `
      <h1 style="color:#1F1B4B;font-size:26px;font-weight:800;margin:0 0 8px;">Your study week 🗓️</h1>
      <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Here's what you accomplished this week on StudyFlow:
      </p>

      <!-- Stats grid -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr>
          <td width="25%" style="text-align:center;padding:16px;background:${BRAND_LIGHT};border-radius:12px;margin:4px;">
            <div style="font-size:28px;font-weight:800;color:${BRAND};">${stats.quizzes}</div>
            <div style="color:#6B7280;font-size:12px;margin-top:4px;">Quizzes taken</div>
          </td>
          <td width="4%" />
          <td width="25%" style="text-align:center;padding:16px;background:${BRAND_LIGHT};border-radius:12px;">
            <div style="font-size:28px;font-weight:800;color:${BRAND};">${stats.flashcards}</div>
            <div style="color:#6B7280;font-size:12px;margin-top:4px;">Flashcards</div>
          </td>
          <td width="4%" />
          <td width="25%" style="text-align:center;padding:16px;background:${BRAND_LIGHT};border-radius:12px;">
            <div style="font-size:28px;font-weight:800;color:${BRAND};">${stats.documents}</div>
            <div style="color:#6B7280;font-size:12px;margin-top:4px;">Documents</div>
          </td>
          <td width="4%" />
          <td width="25%" style="text-align:center;padding:16px;background:${BRAND_LIGHT};border-radius:12px;">
            <div style="font-size:28px;font-weight:800;color:${BRAND};">${stats.xp}</div>
            <div style="color:#6B7280;font-size:12px;margin-top:4px;">XP earned</div>
          </td>
        </tr>
      </table>

      <p style="color:#6B7280;font-size:14px;text-align:center;margin:0 0 24px;">
        ${stats.quizzes + stats.flashcards > 0
          ? "Great effort this week! Keep the momentum going 🔥"
          : "This week was quiet — a fresh week starts now. Let's make it count! 💪"}
      </p>

      <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
        <tr><td style="background:${BRAND};border-radius:10px;padding:14px 32px;">
          <a href="${APP_URL}/dashboard" style="color:#fff;font-weight:700;font-size:15px;text-decoration:none;">
            Start This Week Strong →
          </a>
        </td></tr>
      </table>
      `
    ).replace("__UNSUB_TOKEN__", unsubToken),
  }),

  tipFallback: (name: string, tip: { title: string; body: string }, unsubToken: string) => ({
    subject: `${tip.title} — today's tip from StudyFlow`,
    html: emailBase(
      tip.body.slice(0, 90),
      `
      <h1 style="color:#1F1B4B;font-size:22px;font-weight:800;margin:0 0 8px;">
        Hi ${name}! Here's today's tip 💡
      </h1>

      <div style="background:${BRAND_LIGHT};border-radius:14px;padding:28px;margin:16px 0 24px;border-left:4px solid ${BRAND};">
        <p style="color:${BRAND};font-weight:700;font-size:15px;margin:0 0 10px;">${tip.title}</p>
        <p style="color:#374151;font-size:15px;line-height:1.7;margin:0;">${tip.body}</p>
      </div>

      <p style="color:#6B7280;font-size:13px;text-align:center;margin:0 0 20px;">
        Enable push notifications in the app to get these tips instantly — no email needed!
      </p>

      <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
        <tr><td style="background:${BRAND};border-radius:10px;padding:14px 32px;">
          <a href="${APP_URL}/dashboard" style="color:#fff;font-weight:700;font-size:15px;text-decoration:none;">
            Open StudyFlow →
          </a>
        </td></tr>
      </table>
      `
    ).replace("__UNSUB_TOKEN__", unsubToken),
  }),
};

// ── Random tip (shared with send-study-tip) ────────────────────────────────
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

// ── Main handler ───────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!resendKey) throw new Error("RESEND_API_KEY secret not configured");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    const { type, userId, to, data } = body;

    // ── Helper: send via Resend ─────────────────────────────────────────
    const sendEmail = async (to: string, subject: string, html: string) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "StudyFlow <onboarding@resend.dev>",
          to,
          subject,
          html,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(`Resend error: ${JSON.stringify(err)}`);
      }
      return res.json();
    };

    // ── Helper: get profile + check opt-out ────────────────────────────
    const getProfile = async (uid: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, email_opt_out")
        .eq("id", uid)
        .single();
      return profile;
    };

    const getUnsubToken = (uid: string) =>
      btoa(`${uid}:${Deno.env.get("SUPABASE_JWT_SECRET") ?? "unsub"}`);

    // ── Route by type ───────────────────────────────────────────────────
    let result: any = {};

    if (type === "welcome") {
      // Called by Auth webhook after email confirmation
      const profile = await getProfile(userId);
      if (!profile?.email || profile.email_opt_out) {
        return new Response(JSON.stringify({ skipped: true }), { headers: corsHeaders });
      }
      const name = profile.full_name?.split(" ")[0] || "there";
      const tmpl = templates.welcome(name, getUnsubToken(userId));
      result = await sendEmail(profile.email, tmpl.subject, tmpl.html);

    } else if (type === "reminder") {
      // Called by pg_cron — checks all users inactive for 3+ days
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

      // Get users who haven't had any quiz/flashcard/chat activity in 3+ days
      const { data: inactiveUsers } = await supabase
        .from("profiles")
        .select("id, full_name, email, email_opt_out")
        .eq("email_opt_out", false)
        .not("email", "is", null);

      let sent = 0;
      for (const user of inactiveUsers ?? []) {
        // Check last activity
        const { count: quizCount } = await supabase
          .from("quiz_sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", threeDaysAgo);

        const { count: flashCount } = await supabase
          .from("flashcards")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", threeDaysAgo);

        if ((quizCount ?? 0) > 0 || (flashCount ?? 0) > 0) continue; // Active — skip

        // Calculate actual days since any activity
        const { data: lastQuiz } = await supabase
          .from("quiz_sessions")
          .select("created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const lastDate = lastQuiz?.created_at
          ? new Date(lastQuiz.created_at)
          : new Date(0);
        const daysSince = Math.floor((Date.now() - lastDate.getTime()) / 86400000);

        const name = user.full_name?.split(" ")[0] || "there";
        const tmpl = templates.reminder(name, daysSince, getUnsubToken(user.id));
        await sendEmail(user.email!, tmpl.subject, tmpl.html);
        sent++;
      }
      result = { sent };

    } else if (type === "weekly-summary") {
      // Called by pg_cron every Sunday
      const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: users } = await supabase
        .from("profiles")
        .select("id, full_name, email, email_opt_out")
        .eq("email_opt_out", false)
        .not("email", "is", null);

      let sent = 0;
      for (const user of users ?? []) {
        const [{ count: quizzes }, { count: flashcards }, { count: documents }, xpRow] = await Promise.all([
          supabase.from("quiz_sessions").select("id", { count: "exact", head: true })
            .eq("user_id", user.id).gte("created_at", weekStart),
          supabase.from("flashcards").select("id", { count: "exact", head: true })
            .eq("user_id", user.id).gte("created_at", weekStart),
          supabase.from("user_files").select("id", { count: "exact", head: true })
            .eq("user_id", user.id).gte("created_at", weekStart),
          supabase.from("user_xp").select("weekly_xp").eq("user_id", user.id).single(),
        ]);

        const stats = {
          quizzes: quizzes ?? 0,
          flashcards: flashcards ?? 0,
          documents: documents ?? 0,
          xp: xpRow.data?.weekly_xp ?? 0,
        };

        const name = user.full_name?.split(" ")[0] || "there";
        const tmpl = templates.weeklySummary(name, stats, getUnsubToken(user.id));
        await sendEmail(user.email!, tmpl.subject, tmpl.html);
        sent++;
      }
      result = { sent };

    } else if (type === "tip-fallback") {
      // Email users who have no push token registered
      const tip = TIPS[Math.floor(Math.random() * TIPS.length)];

      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, email_opt_out")
        .eq("email_opt_out", false)
        .not("email", "is", null);

      // Get users who DO have push tokens
      const { data: pushUsers } = await supabase
        .from("push_tokens")
        .select("user_id");
      const pushedIds = new Set((pushUsers ?? []).map((r: any) => r.user_id));

      let sent = 0;
      for (const user of allProfiles ?? []) {
        if (pushedIds.has(user.id)) continue; // Already gets push — skip
        const name = user.full_name?.split(" ")[0] || "there";
        const tmpl = templates.tipFallback(name, tip, getUnsubToken(user.id));
        await sendEmail(user.email!, tmpl.subject, tmpl.html);
        sent++;
      }
      result = { sent, tip: tip.title };

    } else if (type === "broadcast") {
      // ── Custom broadcast to ALL users ──────────────────────────────────
      // Body: { type: "broadcast", subject: "...", message: "...", wrap?: true }
      // `message` is plain text or HTML. If wrap=true (default), it's wrapped in the brand template.
      const { subject, message, wrap = true } = data ?? {};
      if (!subject || !message) throw new Error("broadcast requires data.subject and data.message");

      const { data: users } = await supabase
        .from("profiles")
        .select("id, full_name, email, email_opt_out")
        .eq("email_opt_out", false)
        .not("email", "is", null);

      let sent = 0;
      let failed = 0;
      for (const user of users ?? []) {
        const name = user.full_name?.split(" ")[0] || "there";
        const unsubToken = getUnsubToken(user.id);
        // Personalise {{name}} placeholder in the message
        const personalised = message.replace(/\{\{name\}\}/g, name);
        const html = wrap
          ? emailBase(subject, personalised).replace("__UNSUB_TOKEN__", unsubToken)
          : personalised;
        try {
          await sendEmail(user.email!, subject, html);
          sent++;
        } catch (e) {
          console.error(`Failed to send to ${user.email}:`, e);
          failed++;
        }
      }
      result = { sent, failed, total: (users ?? []).length };

    } else if (type === "single") {
      // Direct call — send to a specific address
      if (!to) throw new Error("Missing 'to' for single email");
      const { subject, html } = data ?? {};
      result = await sendEmail(to, subject, html);

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
