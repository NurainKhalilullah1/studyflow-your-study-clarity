import studyflowPurple from "@/assets/logos/studyflow-purple.png";
import studyflowWhite from "@/assets/logos/studyflow-logo.png";
import studyflowBlack from "@/assets/logos/studyflow-black.png";
import { cn } from "@/lib/utils";

interface StudyFlowLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "purple" | "white" | "black";
  className?: string;
}

const logos = {
  purple: studyflowPurple,
  white: studyflowWhite,
  black: studyflowBlack,
};

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-10 h-10"
};

export const StudyFlowLogo = ({ 
  size = "md", 
  variant = "purple",
  className 
}: StudyFlowLogoProps) => {
  return (
    <img
      src={logos[variant]}
      alt="StudyFlow"
      className={cn(sizeClasses[size], "object-contain", className)}
    />
  );
};
