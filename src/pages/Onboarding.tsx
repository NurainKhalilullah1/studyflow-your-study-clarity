import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, createProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, UserPlus, GraduationCap, BookOpen, ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUniversityData } from "@/hooks/useUniversityData";
import { supabase } from "@/integrations/supabase/client";

const Onboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading, refetch } = useProfile(user?.id);
  const { universities, courses, loadingUniversities, loadingCourses } = useUniversityData();
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState(0);
  const [university, setUniversity] = useState("");
  const [customUniversity, setCustomUniversity] = useState("");
  const [courseOfStudy, setCourseOfStudy] = useState("");
  const [level, setLevel] = useState("");
  const [uniSearch, setUniSearch] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!profileLoading && profile) {
      navigate("/dashboard", { replace: true });
    }
  }, [profileLoading, profile, navigate]);

  const selectedUniversity = university === "Other" ? `Custom: ${customUniversity}` : university;

  const handleCompleteSignup = async () => {
    if (!user) return;
    
    setIsCreating(true);
    try {
      await createProfile(
        user.id,
        user.email,
        user.user_metadata?.full_name || user.user_metadata?.name,
        user.user_metadata?.avatar_url,
        selectedUniversity || undefined,
        courseOfStudy || undefined,
        level || undefined
      );

      // Auto-join group if both fields are set
      if (selectedUniversity && courseOfStudy && level) {
        await supabase.rpc("upsert_user_group", {
          p_university: selectedUniversity,
          p_course_of_study: courseOfStudy,
          p_level: level,
        });

        // Send study community welcome email
        supabase.functions.invoke("send-email", {
          body: {
            type: "studyGroup",
            userId: user.id,
            data: {
              university: selectedUniversity,
              course: courseOfStudy,
              level,
            },
          },
        }).catch((e) => console.warn("Failed to send study group email:", e));
      }
      
      toast({
        title: "Welcome to StudyFlow!",
        description: "Your account has been created successfully.",
      });
      
      await refetch();
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      console.error("Error creating profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create your account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Sparkles className="w-10 h-10 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const filteredUniversities = universities.filter((u: string) =>
    u.toLowerCase().includes(uniSearch.toLowerCase())
  );

  const filteredCourses = courses.filter((c: string) =>
    c.toLowerCase().includes(courseSearch.toLowerCase())
  );

  const steps = [
    // Step 0: Welcome
    <div key="welcome" className="text-center">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <UserPlus className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to StudyFlow</h1>
      <p className="text-muted-foreground mb-6">
        Let's set up your account. We'll ask a couple of quick questions to personalize your experience.
      </p>
      {user && (
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Signing up as</p>
          <p className="font-medium text-foreground">{user.email}</p>
        </div>
      )}
      <Button onClick={() => setStep(1)} className="w-full" size="lg">
        Get Started <ChevronRight className="w-4 h-4 ml-2" />
      </Button>
    </div>,

    // Step 1: University
    <div key="university">
      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <GraduationCap className="w-6 h-6 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-1 text-center">Select Your University</h2>
      <p className="text-sm text-muted-foreground text-center mb-4">This helps us connect you with classmates.</p>

      <Input
        placeholder="Search universities..."
        value={uniSearch}
        onChange={(e) => setUniSearch(e.target.value)}
        className="mb-3"
      />

      <div className="max-h-48 overflow-y-auto space-y-1 mb-3 border border-border rounded-lg p-2">
        {loadingUniversities && <p className="text-sm p-2 text-muted-foreground">Loading...</p>}
        {filteredUniversities.map((u: string) => (
          <button
            key={u}
            onClick={() => { setUniversity(u); setUniSearch(""); }}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              university === u
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-foreground"
            }`}
          >
            {u}
          </button>
        ))}
        <button
          onClick={() => { setUniversity("Other"); setUniSearch(""); }}
          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
            university === "Other"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted text-foreground"
          }`}
        >
          Other (type your own)
        </button>
      </div>

      {university === "Other" && (
        <Input
          placeholder="Enter your university name"
          value={customUniversity}
          onChange={(e) => setCustomUniversity(e.target.value)}
          className="mb-3"
        />
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button
          onClick={() => setStep(2)}
          disabled={!selectedUniversity}
          className="flex-1"
        >
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>,

    // Step 2: Course
    <div key="course">
      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <BookOpen className="w-6 h-6 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-1 text-center">Your Course of Study</h2>
      <p className="text-sm text-muted-foreground text-center mb-4">e.g. Computer Science, Mechanical Engineering</p>

      <div className="mb-2">
        <Input
          placeholder="Search courses..."
          value={courseSearch}
          onChange={(e) => setCourseSearch(e.target.value)}
          className="mb-3"
        />
        <div className="max-h-48 overflow-y-auto space-y-1 mb-3 border border-border rounded-lg p-2">
          {loadingCourses && <p className="text-sm p-2 text-muted-foreground">Loading...</p>}
          {filteredCourses.map((c: string) => (
            <button
              key={c}
              onClick={() => { setCourseOfStudy(c); setCourseSearch(""); }}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                courseOfStudy === c
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
          {filteredCourses.length === 0 && !loadingCourses && (
            <p className="text-sm text-muted-foreground p-2">No standard courses found.</p>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button
          onClick={() => setStep(3)}
          disabled={!courseOfStudy}
          className="flex-1"
        >
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>,

    // Step 3: Level
    <div key="level">
      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <GraduationCap className="w-6 h-6 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-1 text-center">Your Academic Level</h2>
      <p className="text-sm text-muted-foreground text-center mb-4">Select your current level</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {["100 Level", "200 Level", "300 Level", "400 Level", "500 Level", "600 Level"].map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
              level === l
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-primary/50 text-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="p-3 bg-muted/50 rounded-lg mb-4 text-sm text-muted-foreground">
        <p><strong>University:</strong> {selectedUniversity}</p>
        <p><strong>Course:</strong> {courseOfStudy}</p>
        {level && <p><strong>Level:</strong> {level}</p>}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button
          onClick={handleCompleteSignup}
          disabled={isCreating || !level}
          className="flex-1"
        >
          {isCreating ? (
            <><Sparkles className="w-4 h-4 mr-2 animate-spin" /> Completing...</>
          ) : (
            <><UserPlus className="w-4 h-4 mr-2" /> Complete Signup</>
          )}
        </Button>
      </div>
    </div>,
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {steps[step]}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default Onboarding;
