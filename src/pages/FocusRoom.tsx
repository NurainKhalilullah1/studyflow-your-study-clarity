import { useState, useEffect, useRef, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Coffee,
  Brain,
  Music2,
  Wind,
  Droplets,
  Flame,
  TreePine,
  Cloud,
  Waves,
  CheckCircle2,
  Plus,
  Trash2,
  Timer,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type TimerMode = "focus" | "short_break" | "long_break";

interface SoundDef {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
}

interface Task {
  id: string;
  text: string;
  done: boolean;
}

// ─── Tone.js Audio Engine ─────────────────────────────────────────────────────
// Lazy-imported so it doesn't block the initial render.

type ToneModule = typeof import("tone");

interface SoundNode {
  stop: () => void;
  setVolume: (v: number) => void;
}

async function getTone(): Promise<ToneModule> {
  return import("tone");
}

/**
 * Builds a rich, multi-layer ambient sound for each ID using Tone.js.
 * Returns a SoundNode with stop() and setVolume() controls.
 */
async function buildSound(id: string, volume: number): Promise<SoundNode> {
  const Tone = await getTone();

  await Tone.start();

  // Master gain for this sound (0–1)
  const masterGain = new Tone.Gain(volume).toDestination();

  // ── Reverb tail shared across layers ──
  const reverb = new Tone.Reverb({ decay: 3.5, wet: 0.45 }).connect(masterGain);
  await reverb.generate();

  const nodes: Tone.ToneAudioNode[] = [reverb, masterGain];

  switch (id) {
    // ── RAIN ─────────────────────────────────────────────────────────────────
    // Heavy pink noise → low-pass at 800 Hz → slow LFO on volume (rain intensity)
    case "rain": {
      const noise = new Tone.Noise("pink").start();
      const filter = new Tone.Filter({ frequency: 800, type: "lowpass", rolloff: -24 });
      const lfo = new Tone.LFO({ frequency: 0.08, min: 0.4, max: 1.0 }).start();
      const lfoGain = new Tone.Gain(1);
      lfo.connect(lfoGain.gain);

      // Second layer: high-frequency splatter (lighter drops)
      const noise2 = new Tone.Noise("white").start();
      const filter2 = new Tone.Filter({ frequency: 4000, type: "bandpass", Q: 0.8 });
      const attn2 = new Tone.Gain(0.08);

      noise.chain(filter, lfoGain, reverb);
      noise2.chain(filter2, attn2, reverb);

      nodes.push(noise, filter, lfo, lfoGain, noise2, filter2, attn2);
      break;
    }

    // ── FOREST ───────────────────────────────────────────────────────────────
    // Soft pink noise (wind through leaves) + periodic bird-like chirps via FM synth
    case "forest": {
      const noise = new Tone.Noise("pink").start();
      const filter = new Tone.Filter({ frequency: 1800, type: "bandpass", Q: 0.4 });
      const attn = new Tone.Gain(0.3);
      noise.chain(filter, attn, reverb);

      // Bird chirps: FM synth triggered randomly
      const bird = new Tone.FMSynth({
        harmonicity: 8,
        modulationIndex: 2,
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 },
        modulation: { type: "sine" },
        modulationEnvelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 },
        volume: -18,
      }).connect(reverb);

      // Schedule chirps at random intervals
      const chirpLoop = new Tone.Loop(() => {
        if (Math.random() > 0.4) {
          const notes = ["C6", "E6", "G6", "A6", "D6", "F#6"];
          const note = notes[Math.floor(Math.random() * notes.length)];
          bird.triggerAttackRelease(note, "16n");
          // Sometimes a second quick chirp
          if (Math.random() > 0.6) {
            Tone.getDraw().schedule(() => {
              bird.triggerAttackRelease(note, "16n", Tone.now() + 0.12);
            }, Tone.now());
          }
        }
      }, `${(Math.random() * 3 + 1.5).toFixed(1)}s`).start(0);

      nodes.push(noise, filter, attn, bird, chirpLoop);
      break;
    }

    // ── OCEAN ────────────────────────────────────────────────────────────────
    // Brown noise + slow wave LFO (0.12 Hz) + deep low-end rumble
    case "ocean": {
      const noise = new Tone.Noise("brown").start();
      const filter = new Tone.Filter({ frequency: 600, type: "lowpass", rolloff: -12 });

      // Wave LFO — slow swell and fade like real waves
      const waveLfo = new Tone.LFO({ frequency: 0.12, min: 0.1, max: 0.9 }).start();
      const waveGain = new Tone.Gain(0.6);
      waveLfo.connect(waveGain.gain);

      // Deeper rumble layer
      const noise2 = new Tone.Noise("brown").start();
      const bassFilter = new Tone.Filter({ frequency: 120, type: "lowpass" });
      const bassGain = new Tone.Gain(0.25);

      noise.chain(filter, waveGain, reverb);
      noise2.chain(bassFilter, bassGain, masterGain);

      nodes.push(noise, filter, waveLfo, waveGain, noise2, bassFilter, bassGain);
      break;
    }

    // ── FIRE ─────────────────────────────────────────────────────────────────
    // Brown noise → warmth filter + random crackle pops via synth
    case "fire": {
      const noise = new Tone.Noise("brown").start();
      const filter = new Tone.Filter({ frequency: 350, type: "lowpass", rolloff: -12 });
      const warmGain = new Tone.Gain(0.5);

      // Gentle LFO simulates flicker
      const flickerLfo = new Tone.LFO({ frequency: 0.6, min: 0.35, max: 0.65 }).start();
      flickerLfo.connect(warmGain.gain);

      // Crackle pops
      const crackle = new Tone.MembraneSynth({
        pitchDecay: 0.008,
        octaves: 1,
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
        volume: -28,
      }).connect(reverb);

      const crackleLoop = new Tone.Loop(() => {
        if (Math.random() > 0.35) {
          crackle.triggerAttackRelease(`${(Math.random() * 60 + 80).toFixed(0)}`, "32n");
        }
      }, "0.3s").start(0);

      noise.chain(filter, warmGain, reverb);
      nodes.push(noise, filter, warmGain, flickerLfo, crackle, crackleLoop);
      break;
    }

    // ── WIND ─────────────────────────────────────────────────────────────────
    // White noise + high-pass → slow sweeping band-pass LFO (gusts)
    case "wind": {
      const noise = new Tone.Noise("white").start();
      const hpFilter = new Tone.Filter({ frequency: 200, type: "highpass" });
      const bpFilter = new Tone.Filter({ frequency: 800, type: "bandpass", Q: 1.2 });

      // Gust LFO sweeps the bandpass centre frequency
      const gustLfo = new Tone.LFO({ frequency: 0.07, min: 300, max: 1800 }).start();
      gustLfo.connect(bpFilter.frequency);

      // Volume swell (gusts)
      const gustVolLfo = new Tone.LFO({ frequency: 0.1, min: 0.15, max: 0.8 }).start();
      const windGain = new Tone.Gain(0.5);
      gustVolLfo.connect(windGain.gain);

      noise.chain(hpFilter, bpFilter, windGain, reverb);
      nodes.push(noise, hpFilter, bpFilter, gustLfo, gustVolLfo, windGain);
      break;
    }

    // ── WHITE NOISE ──────────────────────────────────────────────────────────
    // Pure pink noise — clean, steady, scientifically proven for focus
    case "clouds": {
      const noise = new Tone.Noise("pink").start();
      const filter = new Tone.Filter({ frequency: 2000, type: "lowpass" });
      const gain = new Tone.Gain(0.55);
      noise.chain(filter, gain, masterGain);
      nodes.push(noise, filter, gain);
      break;
    }

    // ── FOCUS TONE (Binaural 40 Hz) ──────────────────────────────────────────
    // 200 Hz left ear, 240 Hz right ear → 40 Hz gamma binaural beat for focus
    case "binaural": {
      const merge = new Tone.Merge().connect(reverb);

      // Left: 200 Hz, Right: 240 Hz → brain hears 40 Hz gamma beat
      const leftOsc = new Tone.Oscillator({ frequency: 200, type: "sine", volume: -22 }).start();
      const rightOsc = new Tone.Oscillator({ frequency: 240, type: "sine", volume: -22 }).start();

      leftOsc.connect(merge, 0, 0);
      rightOsc.connect(merge, 0, 1);

      // Gentle carrier tone for awareness
      const carrier = new Tone.Oscillator({ frequency: 80, type: "sine", volume: -32 }).start();
      carrier.connect(masterGain);

      nodes.push(merge, leftOsc, rightOsc, carrier);
      break;
    }

    // ── LO-FI HUM ────────────────────────────────────────────────────────────
    // 110 Hz warm bass + 3rd harmonic + soft tape-hiss + slight overdrive
    case "lofi": {
      // Warm bass hum
      const osc1 = new Tone.Oscillator({ frequency: 110, type: "triangle", volume: -20 }).start();
      // 3rd harmonic warmth
      const osc2 = new Tone.Oscillator({ frequency: 330, type: "sine", volume: -32 }).start();

      // Tape hiss
      const hiss = new Tone.Noise("white").start();
      const hissFilter = new Tone.Filter({ frequency: 6000, type: "highpass" });
      const hissGain = new Tone.Gain(0.04);

      // Soft saturation/warmth via Chebyshev waveshaper
      const distortion = new Tone.Chebyshev(2);

      osc1.chain(distortion, reverb);
      osc2.connect(reverb);
      hiss.chain(hissFilter, hissGain, masterGain);

      nodes.push(osc1, osc2, distortion, hiss, hissFilter, hissGain);
      break;
    }

    default:
      break;
  }

  return {
    stop: () => {
      nodes.forEach((n) => {
        try {
          if ("stop" in n && typeof (n as Tone.Noise).stop === "function") {
            (n as Tone.Noise).stop();
          }
          if ("dispose" in n) n.dispose();
        } catch (_) {
          // already disposed
        }
      });
    },
    setVolume: (v: number) => {
      try {
        masterGain.gain.rampTo(v, 0.1);
      } catch (_) { /* disposed */ }
    },
  };
}

// ─── Sound definitions ────────────────────────────────────────────────────────

const SOUNDS: SoundDef[] = [
  { id: "rain",     label: "Rain",        icon: Droplets, color: "from-blue-500/20 to-cyan-500/20",     description: "Gentle rainfall with intensity swells" },
  { id: "forest",   label: "Forest",      icon: TreePine, color: "from-green-500/20 to-emerald-500/20", description: "Wind through leaves + bird chirps" },
  { id: "ocean",    label: "Ocean",       icon: Waves,    color: "from-teal-500/20 to-blue-400/20",     description: "Rolling waves with deep rumble" },
  { id: "fire",     label: "Fireplace",   icon: Flame,    color: "from-orange-500/20 to-red-500/20",    description: "Warm crackles and flicker" },
  { id: "wind",     label: "Wind",        icon: Wind,     color: "from-slate-400/20 to-blue-300/20",    description: "Gusting breeze sweeping past" },
  { id: "clouds",   label: "Pink Noise",  icon: Cloud,    color: "from-gray-300/20 to-slate-400/20",    description: "Pure pink noise for focus" },
  { id: "binaural", label: "Focus Tone",  icon: Brain,    color: "from-purple-500/20 to-violet-500/20", description: "40 Hz gamma binaural beats" },
  { id: "lofi",     label: "Lo-Fi Hum",   icon: Music2,   color: "from-pink-500/20 to-rose-400/20",     description: "Warm tape hum & harmonics" },
];

// ─── Timer config ─────────────────────────────────────────────────────────────

const TIMER_PRESETS: Record<TimerMode, { label: string; icon: React.ElementType; seconds: number; color: string }> = {
  focus:       { label: "Focus",       icon: Brain,  seconds: 25 * 60, color: "text-primary" },
  short_break: { label: "Short Break", icon: Coffee, seconds: 5 * 60,  color: "text-green-400" },
  long_break:  { label: "Long Break",  icon: Timer,  seconds: 15 * 60, color: "text-blue-400" },
};

// ─── Scene backgrounds ────────────────────────────────────────────────────────

const SCENES = [
  { id: "cosmos",  label: "Cosmos",  gradient: "from-[#0d0221] via-[#150b35] to-[#0a1628]", accent: "#7c3aed" },
  { id: "forest",  label: "Forest",  gradient: "from-[#0a1a0f] via-[#0d2a15] to-[#051209]", accent: "#22c55e" },
  { id: "ocean",   label: "Ocean",   gradient: "from-[#020f1a] via-[#041e36] to-[#02111f]", accent: "#0ea5e9" },
  { id: "sunset",  label: "Sunset",  gradient: "from-[#1a0a00] via-[#2d1000] to-[#0f0500]", accent: "#f97316" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

const FocusRoom = () => {
  const { toast } = useToast();

  // Scene
  const [scene, setScene] = useState(SCENES[0]);

  // Timer
  const [mode, setMode] = useState<TimerMode>("focus");
  const [timeLeft, setTimeLeft] = useState(TIMER_PRESETS.focus.seconds);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Audio
  const soundNodesRef = useRef<Map<string, SoundNode>>(new Map());
  const [activeSounds, setActiveSounds] = useState<Set<string>>(new Set());
  const [loadingSounds, setLoadingSounds] = useState<Set<string>>(new Set());
  const [volumes, setVolumes] = useState<Record<string, number>>(
    Object.fromEntries(SOUNDS.map((s) => [s.id, 0.6]))
  );
  const [masterMuted, setMasterMuted] = useState(false);

  // Tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskInput, setTaskInput] = useState("");

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      soundNodesRef.current.forEach((node) => node.stop());
      soundNodesRef.current.clear();
    };
  }, []);

  // ── Timer tick ──
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            setIsRunning(false);
            if (mode === "focus") setSessions((s) => s + 1);
            toast({
              title: mode === "focus" ? "🎯 Focus session complete!" : "⏰ Break time over!",
              description: mode === "focus" ? "Time for a break." : "Ready to focus again?",
            });
            return TIMER_PRESETS[mode].seconds;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, mode, toast]);

  const switchMode = (m: TimerMode) => {
    setMode(m);
    setTimeLeft(TIMER_PRESETS[m].seconds);
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(TIMER_PRESETS[mode].seconds);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const progress = 1 - timeLeft / TIMER_PRESETS[mode].seconds;

  // ── Sound controls ──
  const toggleSound = useCallback(async (sound: SoundDef) => {
    const existingNode = soundNodesRef.current.get(sound.id);

    if (existingNode) {
      // Stop it
      existingNode.stop();
      soundNodesRef.current.delete(sound.id);
      setActiveSounds((prev) => {
        const next = new Set(prev);
        next.delete(sound.id);
        return next;
      });
    } else {
      // Start it — show loading indicator while Tone.js builds the graph
      setLoadingSounds((prev) => new Set(prev).add(sound.id));
      try {
        const vol = masterMuted ? 0 : volumes[sound.id];
        const node = await buildSound(sound.id, vol);
        soundNodesRef.current.set(sound.id, node);
        setActiveSounds((prev) => new Set(prev).add(sound.id));
      } catch (err) {
        console.error("Failed to build sound:", err);
        toast({ title: "Audio error", description: "Could not start this sound.", variant: "destructive" });
      } finally {
        setLoadingSounds((prev) => {
          const next = new Set(prev);
          next.delete(sound.id);
          return next;
        });
      }
    }
  }, [masterMuted, volumes, toast]);

  const handleVolumeChange = useCallback((soundId: string, val: number[]) => {
    const v = val[0];
    setVolumes((prev) => ({ ...prev, [soundId]: v }));
    const node = soundNodesRef.current.get(soundId);
    if (node && !masterMuted) {
      node.setVolume(v);
    }
  }, [masterMuted]);

  const toggleMaster = () => {
    setMasterMuted((m) => {
      const next = !m;
      soundNodesRef.current.forEach((node, id) => {
        node.setVolume(next ? 0 : volumes[id]);
      });
      return next;
    });
  };

  const stopAll = () => {
    soundNodesRef.current.forEach((node) => node.stop());
    soundNodesRef.current.clear();
    setActiveSounds(new Set());
  };

  // ── Tasks ──
  const addTask = () => {
    if (!taskInput.trim()) return;
    setTasks((t) => [...t, { id: Date.now().toString(), text: taskInput.trim(), done: false }]);
    setTaskInput("");
  };

  const toggleTask = (id: string) =>
    setTasks((t) => t.map((task) => task.id === id ? { ...task, done: !task.done } : task));

  const deleteTask = (id: string) =>
    setTasks((t) => t.filter((task) => task.id !== id));

  // ── Fullscreen ──
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  const circumference = 2 * Math.PI * 90;

  return (
    <DashboardLayout>
      <div
        ref={containerRef}
        className={cn(
          "relative min-h-screen w-full transition-all duration-700 bg-gradient-to-br",
          scene.gradient
        )}
      >
        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white/20 animate-pulse"
              style={{
                width: `${Math.random() * 2 + 1}px`,
                height: `${Math.random() * 2 + 1}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 4}s`,
                animationDuration: `${Math.random() * 3 + 2}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row gap-6 p-4 sm:p-6 max-w-7xl mx-auto">
          {/* ── Left Panel ── */}
          <div className="flex-1 flex flex-col gap-5">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span style={{ color: scene.accent }}>⬡</span> Focus Room
                </h1>
                <p className="text-white/50 text-sm mt-0.5">
                  {sessions > 0 ? `${sessions} session${sessions > 1 ? "s" : ""} completed today` : "Stay in the zone"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMaster}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                  title={masterMuted ? "Unmute all" : "Mute all"}
                >
                  {masterMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                  title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Scene selector */}
            <div className="flex gap-2 flex-wrap">
              {SCENES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setScene(s)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                    scene.id === s.id
                      ? "border-white/60 bg-white/20 text-white"
                      : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Timer card */}
            <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 flex flex-col items-center gap-6 shadow-2xl">
              {/* Mode tabs */}
              <div className="flex gap-1 bg-white/5 rounded-full p-1">
                {(Object.entries(TIMER_PRESETS) as [TimerMode, typeof TIMER_PRESETS[TimerMode]][]).map(([key, preset]) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => switchMode(key)}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all",
                        mode === key
                          ? "bg-white/20 text-white shadow-sm"
                          : "text-white/40 hover:text-white/70"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Circular progress */}
              <div className="relative w-52 h-52 flex items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                  <circle
                    cx="100" cy="100" r="90"
                    fill="none"
                    stroke={scene.accent}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - progress)}
                    className="transition-all duration-1000"
                    style={{ filter: `drop-shadow(0 0 8px ${scene.accent})` }}
                  />
                </svg>
                <div className="text-center z-10">
                  <div className="text-5xl font-mono font-bold text-white tracking-tight">
                    {formatTime(timeLeft)}
                  </div>
                  <div className={cn("text-xs font-medium mt-1", TIMER_PRESETS[mode].color)}>
                    {TIMER_PRESETS[mode].label}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={resetTimer}
                  className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                  title="Reset"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsRunning((r) => !r)}
                  className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: `radial-gradient(circle, ${scene.accent}cc, ${scene.accent}88)`,
                    boxShadow: `0 0 24px ${scene.accent}66`,
                  }}
                >
                  {isRunning
                    ? <Pause className="w-7 h-7 text-white" />
                    : <Play className="w-7 h-7 text-white ml-1" />}
                </button>
                <div className="p-3 text-white/30">
                  <Badge variant="outline" className="border-white/20 text-white/50 text-xs">
                    {sessions} 🍅
                  </Badge>
                </div>
              </div>
            </div>

            {/* Session tasks */}
            <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-5 shadow-xl">
              <h3 className="text-white/80 font-semibold text-sm mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" style={{ color: scene.accent }} />
                Session Goals
              </h3>

              <div className="flex gap-2 mb-3">
                <input
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                  placeholder="Add a goal for this session…"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                />
                <button
                  onClick={addTask}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tasks.length === 0 && (
                  <p className="text-white/20 text-xs text-center py-4">No goals yet — add one above</p>
                )}
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl transition-colors group",
                      task.done ? "bg-white/5 opacity-50" : "bg-white/5 hover:bg-white/10"
                    )}
                  >
                    <button onClick={() => toggleTask(task.id)} className="shrink-0">
                      <CheckCircle2
                        className={cn("w-4 h-4 transition-colors", task.done ? "text-green-400" : "text-white/20 hover:text-white/50")}
                      />
                    </button>
                    <span className={cn("flex-1 text-sm text-white/80 truncate", task.done && "line-through text-white/30")}>
                      {task.text}
                    </span>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right Panel: Soundboard ── */}
          <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-4">
            <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-5 shadow-xl">
              <h3 className="text-white/80 font-semibold text-sm mb-4 flex items-center gap-2">
                <Music2 className="w-4 h-4" style={{ color: scene.accent }} />
                Ambient Soundscape
                {activeSounds.size > 0 && (
                  <span className="ml-auto text-xs text-white/40">{activeSounds.size} active</span>
                )}
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {SOUNDS.map((sound) => {
                  const Icon = sound.icon;
                  const isActive = activeSounds.has(sound.id);
                  const isLoading = loadingSounds.has(sound.id);
                  return (
                    <div key={sound.id} className="flex flex-col gap-2">
                      <button
                        onClick={() => toggleSound(sound)}
                        disabled={isLoading}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all",
                          isActive
                            ? `bg-gradient-to-br ${sound.color} border-white/20 shadow-lg`
                            : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/15",
                          isLoading && "opacity-60 cursor-wait"
                        )}
                        title={sound.description}
                      >
                        {isLoading ? (
                          <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        ) : (
                          <Icon
                            className={cn("w-6 h-6 transition-colors", isActive ? "text-white" : "text-white/40")}
                            style={isActive ? { filter: `drop-shadow(0 0 6px ${scene.accent})` } : {}}
                          />
                        )}
                        <span className={cn("text-xs font-medium", isActive ? "text-white" : "text-white/40")}>
                          {sound.label}
                        </span>
                        {isActive && (
                          <div className="flex gap-0.5 items-center h-3">
                            {[0.4, 0.7, 1, 0.8, 0.5].map((h, i) => (
                              <div
                                key={i}
                                className="w-0.5 rounded-full animate-bounce bg-white/70"
                                style={{
                                  height: `${h * 12}px`,
                                  animationDelay: `${i * 0.15}s`,
                                  animationDuration: "0.8s",
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </button>

                      {/* Volume slider — only when active */}
                      {isActive && (
                        <div className="px-1">
                          <Slider
                            min={0}
                            max={1}
                            step={0.05}
                            value={[volumes[sound.id]]}
                            onValueChange={(val) => handleVolumeChange(sound.id, val)}
                            className="h-1"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {activeSounds.size > 0 && (
                <button
                  onClick={stopAll}
                  className="mt-4 w-full py-2 rounded-xl border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 text-xs transition-colors"
                >
                  Stop all sounds
                </button>
              )}
            </div>

            {/* Tips */}
            <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-5 shadow-xl">
              <h3 className="text-white/60 font-semibold text-xs uppercase tracking-wider mb-3">
                Focus Tips
              </h3>
              <ul className="space-y-2">
                {[
                  "Work for 25 min, then take a 5 min break",
                  "After 4 sessions, take a 15 min break",
                  "Mix Rain + Forest for deep focus",
                  "Focus Tone uses 40 Hz gamma binaural beats",
                  "Fireplace + Lo-Fi Hum = virtual coffee shop",
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/40">
                    <span style={{ color: scene.accent }} className="text-[10px] mt-0.5">●</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FocusRoom;
