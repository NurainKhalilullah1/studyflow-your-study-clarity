import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CODE_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 45;
const MAX_ATTEMPTS = 5;

// ── Brand colours matching StudyFlow's index.css ───────────────────────────
const BRAND       = "#5B4FDB"; // hsl(243 75% 59%) — primary
const BRAND_DARK  = "#4338CA"; // gradient end
const BRAND_GLOW  = "#6B6EF8"; // hsl(239 84% 67%) — secondary
const BRAND_LIGHT = "#EEF0FF"; // tinted bg for code box
const ACCENT      = "#F97316"; // hsl(25 95% 53%) — accent orange
const BG          = "#F6F9FC"; // hsl(210 40% 98%) — page background
const TEXT_DARK   = "#1B1E4B"; // hsl(244 47% 15%) — foreground
const TEXT_MUTED  = "#64748B"; // muted-foreground
const APP_URL     = "https://study-flow-app.vercel.app";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function buildEmailHtml(name: string, code: string, purpose: string, expiresInMinutes: number): string {
  const purposeText: Record<string, string> = {
    signup:        "complete your StudyFlow registration",
    google_signin: "confirm your Google sign-in to StudyFlow",
    signin:        "sign in to StudyFlow",
  };
  const purposeLabel = purposeText[purpose] ?? "sign in to StudyFlow";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>StudyFlow Verification</title>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background:${BG};font-family:'Sora','Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${BRAND} 0%,${BRAND_DARK} 100%);border-radius:20px 20px 0 0;padding:32px 40px;text-align:center;">
            <span style="font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px;font-family:'Sora',sans-serif;">📚 StudyFlow</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#fff;padding:40px;border-radius:0 0 20px 20px;box-shadow:0 8px 32px rgba(91,79,219,0.10);">

            <h1 style="color:${TEXT_DARK};font-size:22px;font-weight:800;margin:0 0 10px;font-family:'Sora',sans-serif;">Hi ${name}! 👋</h1>
            <p style="color:${TEXT_MUTED};font-size:15px;line-height:1.7;margin:0 0 28px;font-family:'Sora',sans-serif;">
              Use the code below to <strong style="color:${TEXT_DARK};">${purposeLabel}</strong>.<br/>
              It expires in <strong>${expiresInMinutes} minutes</strong>.
            </p>

            <!-- Code Box -->
            <div style="background:${BRAND_LIGHT};border:2px solid ${BRAND};border-radius:20px;padding:32px;text-align:center;margin:0 0 28px;">
              <p style="color:${BRAND};font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 16px;font-family:'Sora',sans-serif;">Your verification code</p>
              <p style="color:${BRAND};font-size:52px;font-weight:800;letter-spacing:16px;margin:0;font-family:'Sora',sans-serif;">${code}</p>
              <p style="color:${TEXT_MUTED};font-size:12px;margin:14px 0 0;font-family:'Sora',sans-serif;">⏱ Expires in ${expiresInMinutes} minutes</p>
            </div>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
              <tr><td style="background:linear-gradient(135deg,${BRAND} 0%,${BRAND_GLOW} 100%);border-radius:14px;padding:15px 36px;">
                <a href="${APP_URL}/auth" style="color:#fff;font-weight:700;font-size:15px;text-decoration:none;font-family:'Sora',sans-serif;">
                  Open StudyFlow →
                </a>
              </td></tr>
            </table>

            <!-- Security notice -->
            <div style="background:#FFF7ED;border-left:4px solid ${ACCENT};border-radius:0 10px 10px 0;padding:14px 18px;margin:0 0 24px;">
              <p style="color:#9A3412;font-size:13px;margin:0;font-family:'Sora',sans-serif;">
                🔒 <strong>Security notice:</strong> Never share this code with anyone. StudyFlow will never ask for it by phone or email.
              </p>
            </div>

            <!-- Footer -->
            <hr style="border:none;border-top:1px solid ${BRAND_LIGHT};margin:24px 0;" />
            <p style="color:#94A3B8;font-size:12px;text-align:center;margin:0;font-family:'Sora',sans-serif;">
              You received this because someone attempted to sign into a StudyFlow account with this email.<br/>
              If this wasn't you, you can safely ignore this message.
            </p>
            <p style="color:#94A3B8;font-size:11px;text-align:center;margin:8px 0 0;font-family:'Sora',sans-serif;">
              © 2026 StudyFlow. Helping students learn smarter 💜
            </p>

          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl      = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const gmailUser        = Deno.env.get("GMAIL_USER");
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, email, code, name, purpose = "signin" } = body;

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "A valid email address is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ── ACTION: SEND VERIFICATION CODE ──────────────────────────────────────
    if (action === "send") {
      // 1. Rate-limit: check cooldown
      const cooldownThreshold = new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000).toISOString();
      const { data: recentCodes } = await supabaseAdmin
        .from("auth_verification_codes")
        .select("id, created_at")
        .eq("email", normalizedEmail)
        .eq("used", false)
        .gt("created_at", cooldownThreshold)
        .order("created_at", { ascending: false })
        .limit(1);

      if (recentCodes && recentCodes.length > 0) {
        return new Response(
          JSON.stringify({
            error: `Please wait ${RESEND_COOLDOWN_SECONDS} seconds before requesting another code.`,
            cooldown: true,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 2. Invalidate all previous unused codes for this email
      await supabaseAdmin
        .from("auth_verification_codes")
        .update({ used: true })
        .eq("email", normalizedEmail)
        .eq("used", false);

      // 3. Generate & store new code
      const newCode   = generateCode();
      const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000).toISOString();

      const { error: insertError } = await supabaseAdmin
        .from("auth_verification_codes")
        .insert({
          email:        normalizedEmail,
          code:         newCode,
          purpose,
          attempts:     0,
          max_attempts: MAX_ATTEMPTS,
          used:         false,
          expires_at:   expiresAt,
        });

      if (insertError) {
        console.error("Error inserting verification code:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to generate verification code. Please try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const displayName = name || "Student";
      console.log(`[StudyFlow Auth] OTP generated for ${normalizedEmail}. Purpose: ${purpose}`);

      // 4. Send email via Gmail SMTP
      let emailSent = false;

      if (gmailUser && gmailAppPassword) {
        try {
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: gmailUser,
              pass: gmailAppPassword,
            },
          });

          const subjectMap: Record<string, string> = {
            signup:        `Your StudyFlow verification code: ${newCode}`,
            google_signin: `StudyFlow sign-in code: ${newCode}`,
            signin:        `StudyFlow sign-in code: ${newCode}`,
          };

          await transporter.sendMail({
            from:    `StudyFlow <${gmailUser}>`,
            to:      normalizedEmail,
            subject: subjectMap[purpose] ?? `StudyFlow verification code: ${newCode}`,
            html:    buildEmailHtml(displayName, newCode, purpose, CODE_EXPIRY_MINUTES),
          });

          emailSent = true;
          console.log(`[Gmail SMTP] Email delivered to ${normalizedEmail}`);
        } catch (mailErr: any) {
          // Code is already saved — don't fail the request, just log
          console.error("[Gmail SMTP] Failed to send email:", mailErr.message);
        }
      } else {
        console.warn("[Gmail SMTP] GMAIL_USER or GMAIL_APP_PASSWORD secret not set. Email not sent.");
      }

      return new Response(
        JSON.stringify({
          ok:           true,
          message:      "Verification code sent successfully.",
          email_sent:   emailSent,
          expires_in_minutes: CODE_EXPIRY_MINUTES,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: VERIFY CODE ──────────────────────────────────────────────────
    if (action === "verify") {
      if (!code || typeof code !== "string") {
        return new Response(
          JSON.stringify({ error: "Please enter the 6-digit verification code." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const inputCode = code.trim();
      const now = new Date().toISOString();

      const { data: records, error: selectError } = await supabaseAdmin
        .from("auth_verification_codes")
        .select("*")
        .eq("email", normalizedEmail)
        .eq("used", false)
        .gt("expires_at", now)
        .order("created_at", { ascending: false })
        .limit(1);

      if (selectError) {
        console.error("Error fetching code:", selectError);
        return new Response(
          JSON.stringify({ error: "Verification failed. Please try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const activeRecord = records?.[0];

      if (!activeRecord) {
        return new Response(
          JSON.stringify({
            error: "Verification code has expired or is invalid. Please request a new code.",
            expired: true,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Max attempts check
      if (activeRecord.attempts >= activeRecord.max_attempts) {
        await supabaseAdmin
          .from("auth_verification_codes")
          .update({ used: true })
          .eq("id", activeRecord.id);

        return new Response(
          JSON.stringify({
            error: "Too many failed attempts. This code has been deactivated. Please request a new one.",
            locked: true,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Wrong code
      if (activeRecord.code !== inputCode) {
        const nextAttempts = activeRecord.attempts + 1;
        await supabaseAdmin
          .from("auth_verification_codes")
          .update({ attempts: nextAttempts })
          .eq("id", activeRecord.id);

        const remaining = activeRecord.max_attempts - nextAttempts;
        const remainingMsg = remaining > 0 ? ` (${remaining} attempt${remaining > 1 ? "s" : ""} remaining)` : "";

        return new Response(
          JSON.stringify({
            error: `Incorrect verification code${remainingMsg}. Please check your email and try again.`,
            remaining_attempts: remaining,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ✅ Code correct — mark used
      await supabaseAdmin
        .from("auth_verification_codes")
        .update({ used: true })
        .eq("id", activeRecord.id);

      // Update profile last_verified_at
      await supabaseAdmin
        .from("profiles")
        .update({ last_verified_at: now })
        .eq("email", normalizedEmail);

      return new Response(
        JSON.stringify({
          ok:          true,
          verified:    true,
          message:     "Verification successful.",
          verified_at: now,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: '${action}'. Expected 'send' or 'verify'.` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("auth-verification exception:", err);
    return new Response(
      JSON.stringify({ error: err.message || "An unexpected error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
