import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { StudyFlowLogo } from "./StudyFlowLogo";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isSessionVerified } = useAuth();
  const isAuthenticated = Boolean(user && isSessionVerified);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 group"
          >
            <div className="relative">
              <StudyFlowLogo size="lg" variant="purple" className="transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            </div>
            <span className="text-xl font-bold text-foreground font-heading tracking-tight">StudyFlow</span>
          </Link>

          {/* Desktop Navigation */}
          <motion.div
            className="hidden md:flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Button variant="ghost" size="sm" asChild>
              <Link to="/features">Features</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/about">About</Link>
            </Button>
            {isAuthenticated ? (
              <>
                <ThemeToggle />
                <Button variant="glow" size="sm" asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/auth">Login</Link>
                </Button>
                <ThemeToggle />
                <Button variant="glow" size="sm" asChild>
                  <Link to="/auth">Get Started</Link>
                </Button>
              </>
            )}
          </motion.div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <X className="w-6 h-6 text-foreground" />
            ) : (
              <Menu className="w-6 h-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-border/40 py-4"
            >
              <div className="flex flex-col gap-3">
                <Button variant="ghost" className="justify-start" asChild onClick={() => setIsOpen(false)}>
                  <Link to="/features">Features</Link>
                </Button>
                <Button variant="ghost" className="justify-start" asChild onClick={() => setIsOpen(false)}>
                  <Link to="/about">About</Link>
                </Button>
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground px-2">Theme</span>
                      <ThemeToggle />
                    </div>
                    <Button variant="glow" asChild onClick={() => setIsOpen(false)}>
                      <Link to="/dashboard">Dashboard</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <Button variant="ghost" className="justify-start flex-1" asChild onClick={() => setIsOpen(false)}>
                        <Link to="/auth">Login</Link>
                      </Button>
                      <ThemeToggle />
                    </div>

                    <Button variant="glow" asChild onClick={() => setIsOpen(false)}>
                      <Link to="/auth">Get Started</Link>
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};
