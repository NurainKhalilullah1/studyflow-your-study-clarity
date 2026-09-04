import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, ArrowRight, Eye, EyeOff, ArrowLeft, ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import { StudyFlowLogo } from "@/components/StudyFlowLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

// ── Zod validation schemas ──────────────────────────────────────────────────
const emailSchema = z
  .string()
  .trim()
  .min(1, { message: "Email is required" })
  .email({ message: "Please enter a valid email address" })
  .max(255, { message: "Email must be less than 255 characters" });

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Password is required" }),
});

const signUpSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" })
    .max(72, { message: "Password must be less than 72 characters" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const resetPasswordSchema = z.object({
  email: emailSchema,
});

const RESEND_COOLDOWN = 60; // seconds

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── OTP state ───────────────────────────────────────────────────────────────
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationPurpose, setVerificationPurpose] = useState<"signin" | "signup" | "google_signin">("signin");
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, signInWithGoogle, resetPassword, user, loading, isSessionVerified, sendVerificationCode, verifyCode } = useAuth();

  // ── Redirect if fully verified ──────────────────────────────────────────────
  useEffect(() => {
    if (!loading && user && isSessionVerified) {
      const from = (location.state as any)?.from || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [user, loading, isSessionVerified, navigate, location.state]);

  // ── Google OAuth callback: user arrived, trigger OTP ─────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isGoogleCallback = params.get("google_callback") === "true";

    if (isGoogleCallback && user && !isSessionVerified && !showVerification) {
      const userEmail = user.email || "";
      const userName = user.user_metadata?.full_name || user.user_metadata?.name || "";
      triggerVerification(userEmail, "google_signin", userName);
      // Clean up the URL
      window.history.replaceState({}, "", "/auth");
    }
  }, [user, isSessionVerified, showVerification]);

  // ── Handle pendingVerification from ProtectedRoute ────────────────────────
  useEffect(() => {
    const state = location.state as any;
    if (state?.pendingVerification && user && !isSessionVerified && !showVerification) {
      const userEmail = user.email || "";
      const userName = user.user_metadata?.full_name || user.user_metadata?.name || "";
      triggerVerification(userEmail, "signin", userName);
    }
  }, [location.state, user, isSessionVerified, showVerification]);

  // ── Resend countdown timer ────────────────────────────────────────────────
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const clearErrors = () => setErrors({});

  // ── Trigger OTP dispatch & switch to verification screen ─────────────────
  const triggerVerification = useCallback(async (
    targetEmail: string,
    purpose: "signin" | "signup" | "google_signin",
    name?: string
  ) => {
    setVerificationEmail(targetEmail);
    setVerificationPurpose(purpose);
    setOtpValue("");
    setOtpError("");
    setIsSendingCode(true);
    setShowVerification(true);

    const result = await sendVerificationCode(targetEmail, purpose, name);

    setIsSendingCode(false);

    if (!result.ok && !result.cooldown) {
      toast({
        title: "Couldn't send verification code",
        description: result.error || "Please try again.",
        variant: "destructive",
      });
    } else {
      setCodeSent(true);
      setResendCountdown(RESEND_COOLDOWN);
      if (!result.cooldown) {
        toast({
          title: "Verification code sent!",
          description: `Check your email: ${targetEmail}`,
        });
      }
    }
  }, [sendVerificationCode, toast]);

  // ── Handle resend ─────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setOtpValue("");
    setOtpError("");
    await triggerVerification(verificationEmail, verificationPurpose);
  };

  // ── Handle OTP submission ─────────────────────────────────────────────────
  const handleOtpComplete = async (value: string) => {
    if (value.length !== 6) return;
    setIsVerifying(true);
    setOtpError("");

    const result = await verifyCode(verificationEmail, value);
    setIsVerifying(false);

    if (result.ok) {
      toast({
        title: "✓ Verified!",
        description: "Welcome to StudyFlow.",
      });
      const from = (location.state as any)?.from || "/dashboard";
      navigate(from, { replace: true });
    } else {
      setOtpError(result.error || "Incorrect code. Please try again.");
      setOtpValue("");
    }
  };

  // ── Main form submit (email/password) ─────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearErrors();

    const schema = isLogin ? signInSchema : signUpSchema;
    const result = schema.safeParse({ email, password, confirmPassword });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      setIsLoading(false);
      return;
    }

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      // Successful sign-in — send OTP
      await triggerVerification(email, "signin");
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Fire async welcome email (fire-and-forget)
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.id) {
          supabase.functions.invoke("send-email", {
            body: { type: "welcome", userId: user.id },
          }).catch(() => {/* silently ignore */});
        }
      });

      // Send OTP for sign-up verification
      await triggerVerification(email, "signup");
    }

    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearErrors();

    const result = resetPasswordSchema.safeParse({ email });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      setIsLoading(false);
      return;
    }

    const { error } = await resetPassword(email);
    if (error) {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Check your email",
        description: "We've sent you a password reset link.",
      });
      setShowForgotPassword(false);
      setEmail("");
    }
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        title: "Google sign in failed",
        description: error.message,
        variant: "destructive",
      });
    }
    // On web: redirect happens; on native: onAuthStateChange fires →
    // google_callback check or pendingVerification will pick it up
  };

  const purposeLabel = {
    signin: "sign in",
    signup: "create your account",
    google_signin: "complete your Google sign-in",
  }[verificationPurpose];

  // ── Right-side decorative panel (shared) ──────────────────────────────────
  const RightPanel = () => (
    <div className="hidden lg:flex w-1/2 relative overflow-hidden gradient-primary">
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      </div>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-center"
      >
        <StudyFlowLogo size="xl" variant="white" className="mb-8 opacity-80" />
        <blockquote className="text-3xl lg:text-4xl font-bold text-primary-foreground leading-relaxed max-w-lg">
          "Focus on what matters. Let AI handle the rest."
        </blockquote>
        <p className="mt-6 text-primary-foreground/70 text-lg">— The StudyFlow Way</p>
        <div className="grid grid-cols-3 gap-8 mt-16">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary-foreground">10K+</p>
            <p className="text-sm text-primary-foreground/60">Students</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary-foreground">50K+</p>
            <p className="text-sm text-primary-foreground/60">PDFs Analyzed</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary-foreground">98%</p>
            <p className="text-sm text-primary-foreground/60">Satisfaction</p>
          </div>
        </div>
      </motion.div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW: VERIFICATION CODE SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (showVerification) {
    return (
      <div className="min-h-screen flex relative">
        <div className="absolute top-4 right-4 z-10 lg:hidden">
          <ThemeToggle />
        </div>

        {/* Left Side */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            {/* Logo */}
            <a href="/" className="flex items-center gap-2 mb-8 group">
              <StudyFlowLogo size="lg" variant="purple" className="transition-transform group-hover:scale-110" />
              <span className="text-xl font-bold text-foreground">StudyFlow</span>
            </a>

            {/* Back button — only for email/password flows, not Google callbacks */}
            {verificationPurpose !== "google_signin" && (
              <button
                type="button"
                onClick={() => {
                  setShowVerification(false);
                  setOtpValue("");
                  setOtpError("");
                }}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}

            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Check your email
              </h1>
              <p className="text-muted-foreground">
                We sent a 6-digit verification code to{" "}
                {isSendingCode ? (
                  <span className="text-foreground font-medium">sending...</span>
                ) : (
                  <span className="text-foreground font-medium">{verificationEmail}</span>
                )}{" "}
                to {purposeLabel}.
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                The code expires in 10 minutes.
              </p>
            </div>

            {/* OTP Input */}
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={(val) => {
                    setOtpValue(val);
                    setOtpError("");
                    if (val.length === 6) {
                      handleOtpComplete(val);
                    }
                  }}
                  disabled={isVerifying || isSendingCode}
                  id="otp-input"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="h-14 w-14 text-xl border-border" />
                    <InputOTPSlot index={1} className="h-14 w-14 text-xl border-border" />
                    <InputOTPSlot index={2} className="h-14 w-14 text-xl border-border" />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} className="h-14 w-14 text-xl border-border" />
                    <InputOTPSlot index={4} className="h-14 w-14 text-xl border-border" />
                    <InputOTPSlot index={5} className="h-14 w-14 text-xl border-border" />
                  </InputOTPGroup>
                </InputOTP>

                <AnimatePresence>
                  {otpError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-sm text-destructive text-center"
                    >
                      {otpError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Verify Button */}
              <Button
                variant="hero"
                size="lg"
                className="w-full group"
                onClick={() => handleOtpComplete(otpValue)}
                disabled={otpValue.length !== 6 || isVerifying || isSendingCode}
                id="verify-btn"
              >
                {isVerifying ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : isSendingCode ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Sending code...
                  </span>
                ) : (
                  <>
                    Verify & Continue
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>

              {/* Resend */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the code?{" "}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCountdown > 0 || isSendingCode || isVerifying}
                    className={`font-medium inline-flex items-center gap-1 transition-colors ${
                      resendCountdown > 0 || isSendingCode
                        ? "text-muted-foreground cursor-not-allowed"
                        : "text-primary hover:text-primary/80"
                    }`}
                    id="resend-btn"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSendingCode ? "animate-spin" : ""}`} />
                    {resendCountdown > 0
                      ? `Resend in ${resendCountdown}s`
                      : "Resend code"}
                  </button>
                </p>
              </div>

              {/* Security note */}
              <p className="text-xs text-muted-foreground/60 text-center">
                🔒 This code was sent by StudyFlow to confirm your identity. Never share it with anyone.
              </p>
            </div>
          </motion.div>
        </div>

        <RightPanel />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW: FORGOT PASSWORD
  // ══════════════════════════════════════════════════════════════════════════
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <button
            type="button"
            onClick={() => {
              setShowForgotPassword(false);
              clearErrors();
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </button>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Reset your password
            </h1>
            <p className="text-muted-foreground">
              Enter your email and we'll send you a reset link.
            </p>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) clearErrors();
                  }}
                  className={`pl-10 h-12 bg-muted/50 border-border focus:border-primary ${
                    errors.email ? "border-destructive" : ""
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full group"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Sending link...
                </span>
              ) : (
                <>
                  Send Reset Link
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW: MAIN SIGN IN / SIGN UP
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen flex relative">
      {/* Theme Toggle - visible on mobile, hidden on lg (right side has its own) */}
      <div className="absolute top-4 right-4 z-10 lg:hidden">
        <ThemeToggle />
      </div>
      
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 mb-8 group">
            <StudyFlowLogo size="lg" variant="purple" className="transition-transform group-hover:scale-110" />
            <span className="text-xl font-bold text-foreground">StudyFlow</span>
          </a>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {isLogin ? "Welcome back to StudyFlow." : "Create your account."}
            </h1>
            <p className="text-muted-foreground">
              {isLogin 
                ? "Enter your details to access your workspace." 
                : "Start your journey to academic clarity."}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  name="email_field"
                  autoComplete="off"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) clearErrors();
                  }}
                  className={`pl-10 h-12 bg-muted/50 border-border focus:border-primary ${
                    errors.email ? "border-destructive" : ""
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password_field"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) clearErrors();
                  }}
                  className={`pl-10 pr-10 h-12 bg-muted/50 border-border focus:border-primary ${
                    errors.password ? "border-destructive" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
              
              {/* Password Strength Indicator - Only for Sign Up */}
              <AnimatePresence>
                {!isLogin && password && (
                  <PasswordStrengthIndicator password={password} />
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2"
                >
                  <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword) clearErrors();
                      }}
                      className={`pl-10 h-12 bg-muted/50 border-border focus:border-primary ${
                        errors.confirmPassword ? "border-destructive" : ""
                      }`}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {isLogin && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full group"
              disabled={isLoading}
              id="auth-submit-btn"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {isLogin ? "Signing in..." : "Creating account..."}
                </span>
              ) : (
                <>
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* Google Button */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full h-12"
              onClick={handleGoogleSignIn}
              id="google-signin-btn"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>
          </form>

          {/* Toggle Sign In / Sign Up */}
          <div className="mt-8 text-center">
            <p className="text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setPassword("");
                  setConfirmPassword("");
                  clearErrors();
                }}
                className="text-primary font-medium hover:text-primary/80 transition-colors"
              >
                {isLogin ? "Sign Up" : "Sign In"}
              </button>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Right Side - Gradient Background */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden gradient-primary">
        {/* Decorative Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        </div>

        {/* Floating Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Quote Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-center"
        >
          <StudyFlowLogo size="xl" variant="white" className="mb-8 opacity-80" />
          <blockquote className="text-3xl lg:text-4xl font-bold text-primary-foreground leading-relaxed max-w-lg">
            "Focus on what matters. Let AI handle the rest."
          </blockquote>
          <p className="mt-6 text-primary-foreground/70 text-lg">— The StudyFlow Way</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-foreground">10K+</p>
              <p className="text-sm text-primary-foreground/60">Students</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-foreground">50K+</p>
              <p className="text-sm text-primary-foreground/60">PDFs Analyzed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-foreground">98%</p>
              <p className="text-sm text-primary-foreground/60">Satisfaction</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
