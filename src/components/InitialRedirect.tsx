import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/contexts/AuthContext";
import Index from "@/pages/Index";

const InitialRedirect = () => {
  const navigate = useNavigate();
  const { user, loading, isSessionVerified } = useAuth();
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!loading && isNative) {
      if (user && isSessionVerified) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/auth", { replace: true });
      }
    }
  }, [loading, isNative, user, isSessionVerified, navigate]);

  // For web, show the landing page (Index)
  // For mobile, show nothing (or a loader) until the redirect triggers
  if (isNative) {
    return null;
  }

  return <Index />;
};

export default InitialRedirect;
