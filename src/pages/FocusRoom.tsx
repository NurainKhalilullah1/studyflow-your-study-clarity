import { useState, useEffect, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
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
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

type TimerMode = "focus" | "short_break" | "long_break";

interface Sound {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  /** Oscillator-based synthetic tone descriptor (no external files needed) */
  freq: number;
  type: OscillatorType;
}

interface Task {
  id: string;
  text: string;
  done: boolean;
}

// ─── Sound engine (Web Audio API) ────────────────────────────────────────────

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private nodes: Map<string, { osc: OscillatorNode | null; gain: GainNode; noise?: AudioBufferSourceNode }> = new Map();

  private getCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  /** Create pink-ish noise buffer */
  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  play(soundId: string, freq: number, oscType: OscillatorType, volume: number) {
    const ctx = this.getCtx();
    if (ctx.state === "suspended") ctx.resume();

    // Stop existing node for this sound
    this.stop(soundId);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
    gain.connect(ctx.destination);

    let osc: OscillatorNode | null = null;
    let noiseNode: AudioBufferSourceNode | undefined;

    if (freq === 0) {
      // Noise-based sound (rain, ocean, wind, fire)
      const buffer = this.createNoiseBuffer(ctx);
      noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;
      noiseNode.loop = true;

      // Shape the noise with a biquad filter
      const filter = ctx.createBiquadFilter();
      filter.type = oscType === "sawtooth" ? "lowpass" : oscType === "square" ? "bandpass" : "highpass";
      filter.frequency.value = oscType === "sawtooth" ? 800 : oscType === "square" ? 400 : 1200;
      filter.Q.value = 0.5;

      noiseNode.connect(filter);
      filter.connect(gain);
      noiseNode.start();
    } else {
      // Tone-based sound (binaural, lo-fi hum, etc.)
      osc = ctx.createOscillator();
      osc.type = oscType;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Add subtle LFO vibrato
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.1;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 2;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      osc.connect(gain);
      osc.start();
    }

    this.nodes.set(soundId, { osc, gain, noise: noiseNode });
  }

  setVolume(soundId: string, volume: number) {
    const node = this.nodes.get(soundId);
    if (node && this.ctx) {
      node.gain.gain.setTargetAtTime(volume * 0.15, this.ctx.currentTime, 0.1);
    }
  }

  stop(soundId: string) {
    const node = this.nodes.get(soundId);
    if (node) {
      try {
        node.osc?.stop();
        node.noise?.stop();
      } catch (_) { /* already stopped */ }
      this.nodes.delete(soundId);
    }
  }

  stopAll() {
    for (const id of this.nodes.keys()) {
      this.stop(id);
    }
  }
}

// ─── Sounds config ────────────────────────────────────────────────────────────

const SOUNDS: Sound[] = [
  { id: "rain",    label: "Rain",        icon: Droplets, color: "from-blue-500/20 to-cyan-500/20",    freq: 0,   type: "sine" },
  { id: "forest",  label: "Forest",      icon: TreePine, color: "from-green-500/20 to-emerald-500/20", freq: 0,   type: "highpass" },
  { id: "ocean",   label: "Ocean",       icon: Waves,    color: "from-teal-500/20 to-blue-400/20",    freq: 0,   type: "sawtooth" },
  { id: "fire",    label: "Fireplace",   icon: Flame,    color: "from-orange-500/20 to-red-500/20",   freq: 0,   type: "square" },
  { id: "wind",    label: "Wind",        icon: Wind,     color: "from-slate-400/20 to-blue-300/20",   freq: 0,   type: "triangle" },
  { id: "clouds",  label: "White Noise", icon: Cloud,    color: "from-gray-300/20 to-slate-400/20",   freq: 0,   type: "bandpass" as OscillatorType },
  { id: "binaural",label: "Focus Tone",  icon: Brain,    color: "from-purple-500/20 to-violet-500/20",freq: 40,  type: "sine" },
  { id: "lofi",    label: "Lo-Fi Hum",   icon: Music2,   color: "from-pink-500/20 to-rose-400/20",    freq: 110, type: "triangle" },
];

// ─── Timer config ─────────────────────────────────────────────────────────────

const TIMER_PRESETS: Record<TimerMode, { label: string; icon: React.ElementType; seconds: number; color: string }> = {
  focus:       { label: "Focus",       icon: Brain,   seconds: 25 * 60, color: "text-primary" },
  short_break: { label: "Short Break", icon: Coffee,  seconds: 5 * 60,  color: "text-green-400" },
  long_break:  { label: "Long Break",  icon: Timer,   seconds: 15 * 60, color: "text-blue-400" },
};

// ─── Scene backgrounds ────────────────────────────────────────────────────────

const SCENES = [
  { id: "cosmos",  label: "Cosmos",    gradient: "from-[#0d0221] via-[#150b35] to-[#0a1628]", accent: "#7c3aed" },
  { id: "forest",  label: "Forest",    gradient: "from-[#0a1a0f] via-[#0d2a15] to-[#051209]", accent: "#22c55e" },
  { id: "ocean",   label: "Ocean",     gradient: "from-[#020f1a] via-[#041e36] to-[#02111f]", accent: "#0ea5e9" },
  { id: "sunset",  label: "Sunset",    gradient: "from-[#1a0a00] via-[#2d1000] to-[#0f0500]", accent: "#f97316" },
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
  const engineRef = useRef<AmbientSoundEngine | null>(null);
  const [activeSounds, setActiveSounds] = useState<Set<string>>(new Set());
  const [volumes, setVolumes] = useState<Record<string, number>>(
    Object.fromEntries(SOUNDS.map((s) => [s.id, 0.5]))
  );
  const [masterMuted, setMasterMuted] = useState(false);

  // Tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskInput, setTaskInput] = useState("");

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Engine init ──
  useEffect(() => {
    engineRef.current = new AmbientSoundEngine();
    return () => {
      engineRef.current?.stopAll();
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
  const toggleSound = useCallback((sound: Sound) => {
    const engine = engineRef.current;
    if (!engine) return;

    setActiveSounds((prev) => {
      const next = new Set(prev);
      if (next.has(sound.id)) {
        engine.stop(sound.id);
        next.delete(sound.id);
      } else {
        engine.play(sound.id, sound.freq, sound.type, masterMuted ? 0 : volumes[sound.id]);
        next.add(sound.id);
      }
      return next;
    });
  }, [masterMuted, volumes]);

  const handleVolumeChange = useCallback((soundId: string, val: number[]) => {
    const v = val[0];
    setVolumes((prev) => ({ ...prev, [soundId]: v }));
    if (activeSounds.has(soundId) && !masterMuted) {
      engineRef.current?.setVolume(soundId, v);
    }
  }, [activeSounds, masterMuted]);

  const toggleMaster = () => {
    setMasterMuted((m) => {
      const next = !m;
      if (engineRef.current) {
        for (const id of activeSounds) {
          engineRef.current.setVolume(id, next ? 0 : volumes[id]);
        }
      }
      return next;
    });
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
        {/* Animated stars/particles overlay */}
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

            {/* Header row */}
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
                  {/* Track */}
                  <circle
                    cx="100" cy="100" r="90"
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="8"
                  />
                  {/* Progress arc */}
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

              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
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
                  <span className="ml-auto text-xs text-white/40">
                    {activeSounds.size} active
                  </span>
                )}
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {SOUNDS.map((sound) => {
                  const Icon = sound.icon;
                  const isActive = activeSounds.has(sound.id);
                  return (
                    <div key={sound.id} className="flex flex-col gap-2">
                      <button
                        onClick={() => toggleSound(sound)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all",
                          isActive
                            ? `bg-gradient-to-br ${sound.color} border-white/20 shadow-lg`
                            : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/15"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-6 h-6 transition-colors",
                            isActive ? "text-white" : "text-white/40"
                          )}
                          style={isActive ? { filter: `drop-shadow(0 0 6px ${scene.accent})` } : {}}
                        />
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
                  onClick={() => {
                    engineRef.current?.stopAll();
                    setActiveSounds(new Set());
                  }}
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
                  "Binaural tones boost concentration",
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
