import { motion } from "framer-motion";
import splashImg from "@/assets/splash-screen.png";

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#2c1c98] overflow-hidden select-none"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.4, delay: 1.6 }}
      onAnimationComplete={onComplete}
    >
      <img
        src={splashImg}
        alt="StudyFlow"
        className="w-full h-full object-cover max-w-lg mx-auto"
      />
    </motion.div>
  );
};
