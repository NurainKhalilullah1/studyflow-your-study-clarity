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

// ── Brand colours matching StudyFlow's design system ─────────────────────────
const BRAND       = "#5B4FDB"; // primary
const BRAND_DARK  = "#4338CA"; // header gradient
const BRAND_LIGHT = "#EEF0FF"; // tinted code box
const ACCENT      = "#EA580C"; // security notice border
const BG          = "#F8FAFC"; // slate-50 background
const TEXT_DARK   = "#0F172A"; // slate-900 foreground
const TEXT_MUTED  = "#64748B"; // slate-500 muted text

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getPurposeDescription(purpose: string): string {
  const map: Record<string, string> = {
    signup: "complete your StudyFlow registration",
    google_signin: "sign in with Google to StudyFlow",
    signin: "sign in to your StudyFlow account",
  };
  return map[purpose] ?? "verify your StudyFlow account";
}

function buildEmailText(name: string, code: string, purpose: string, expiresInMinutes: number): string {
  const actionText = getPurposeDescription(purpose);

  return `Hello ${name},

Your StudyFlow verification code is: ${code}

Please enter this 6-digit code in StudyFlow to ${actionText}. This code will expire in ${expiresInMinutes} minutes.

Security Notice:
Never share this code with anyone. StudyFlow team members will never ask for your verification code.

If you did not make this request, you can safely ignore this email.

—
The StudyFlow Team`;
}

function buildEmailHtml(name: string, code: string, purpose: string, expiresInMinutes: number): string {
  const actionText = getPurposeDescription(purpose);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>StudyFlow Verification Code</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');
    body {
      margin: 0;
      padding: 0;
      background-color: ${BG};
      font-family: 'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BG};font-family:'Sora',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);border:1px solid #E2E8F0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%);padding:28px 36px;text-align:center;">
              <h2 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">StudyFlow</h2>
              <p style="margin:4px 0 0;color:#E0E7FF;font-size:13px;font-weight:500;">Your Study Clarity</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:36px 36px 28px;">
              <h1 style="margin:0 0 12px;color:${TEXT_DARK};font-size:20px;font-weight:700;">
                Hello ${name},
              </h1>
              <p style="margin:0 0 24px;color:${TEXT_MUTED};font-size:15px;line-height:1.6;">
                Use the verification code below to <strong style="color:${TEXT_DARK};">${actionText}</strong>. This code is valid for <strong>${expiresInMinutes} minutes</strong>.
              </p>

              <!-- Verification Code Display -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td align="center" style="background-color:${BRAND_LIGHT};border:1.5px dashed ${BRAND};border-radius:12px;padding:24px 16px;">
                    <p style="margin:0 0 8px;color:${BRAND};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
                      Verification Code
                    </p>
                    <div style="color:${BRAND};font-size:36px;font-weight:800;letter-spacing:8px;font-family:'Sora',Courier,monospace;">
                      ${code}
                    </div>
                    <p style="margin:8px 0 0;color:${TEXT_MUTED};font-size:12px;">
                      Expires in ${expiresInMinutes} minutes
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Instruction callout -->
              <p style="margin:0 0 24px;color:${TEXT_MUTED};font-size:14px;line-height:1.5;text-align:center;">
                Enter this 6-digit code in the app to continue.
              </p>

              <!-- Security Warning Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFBEB;border-left:4px solid ${ACCENT};border-radius:4px;margin:0 0 24px;">
                <tr>
                  <td style="padding:12px 16px;">
                    <p style="margin:0;color:#92400E;font-size:12.5px;line-height:1.5;">
                      <strong>Security Notice:</strong> Never share this code with anyone. StudyFlow team members will never ask for your verification code.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0 16px;" />

              <!-- Subtext / Footer -->
              <p style="margin:0 0 8px;color:#94A3B8;font-size:12px;line-height:1.5;text-align:center;">
                If you did not attempt to sign in or register, you can safely disregard this email. Your account remains secure.
              </p>
              <p style="margin:0;color:#94A3B8;font-size:11px;text-align:center;">
                © 2026 StudyFlow • Intelligent study clarity
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl        = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const gmailUser          = Deno.env.get("GMAIL_USER");
    const gmailAppPassword   = Deno.env.get("GMAIL_APP_PASSWORD");

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

      // 4. Send email via Gmail SMTP with anti-spam optimizations
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

          // Subject line following standard security patterns (like Google, Apple, Slack)
          const subject = `${newCode} is your StudyFlow verification code`;
          const textBody = buildEmailText(displayName, newCode, purpose, CODE_EXPIRY_MINUTES);
          const htmlBody = buildEmailHtml(displayName, newCode, purpose, CODE_EXPIRY_MINUTES);

          await transporter.sendMail({
            from: `StudyFlow <${gmailUser}>`,
            replyTo: gmailUser,
            to: normalizedEmail,
            subject,
            text: textBody,
            html: htmlBody,
            headers: {
              "X-Auto-Response-Suppress": "OOF, AutoReply",
            },
          });

          emailSent = true;
          console.log(`[Gmail SMTP] Email successfully delivered to ${normalizedEmail}`);
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

      // Find most recent unused code for this email
      const { data: records, error: fetchError } = await supabaseAdmin
        .from("auth_verification_codes")
        .select("*")
        .eq("email", normalizedEmail)
        .eq("used", false)
        .gt("expires_at", now)
        .order("created_at", { ascending: false })
        .limit(1);

      if (fetchError || !records || records.length === 0) {
        return new Response(
          JSON.stringify({
            error: "No active verification code found or it has expired. Please request a new code.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const record = records[0];

      // Check max attempts
      if (record.attempts >= record.max_attempts) {
        await supabaseAdmin
          .from("auth_verification_codes")
          .update({ used: true })
          .eq("id", record.id);

        return new Response(
          JSON.stringify({
            error: "Too many failed attempts. Please request a new verification code.",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check code match
      if (record.code !== inputCode) {
        const remainingAttempts = record.max_attempts - (record.attempts + 1);
        await supabaseAdmin
          .from("auth_verification_codes")
          .update({ attempts: record.attempts + 1 })
          .eq("id", record.id);

        return new Response(
          JSON.stringify({
            error: remainingAttempts > 0
              ? `Incorrect code. ${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining.`
              : "Incorrect code. Please request a new one.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Code is correct — mark as used
      await supabaseAdmin
        .from("auth_verification_codes")
        .update({ used: true })
        .eq("id", record.id);

      await supabaseAdmin
        .from("profiles")
        .update({ last_verified_at: now })
        .eq("email", normalizedEmail);

      console.log(`[StudyFlow Auth] OTP verified successfully for ${normalizedEmail}`);

      return new Response(
        JSON.stringify({
          ok: true,
          verified: true,
          message: "Verification successful.",
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
