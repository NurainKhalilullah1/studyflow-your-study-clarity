import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { User, FileText, Copy, Check, Download, Sparkles, ImageOff, RefreshCw, Volume2, VolumeX } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { StudyFlowLogo } from "@/components/StudyFlowLogo";
import { ImagePreview } from "./ImagePreview";
import { useState, useEffect, useRef } from "react";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  attachment_name?: string;
  image_url?: string;            // user-uploaded image
  generated_image_url?: string; // AI-generated via Pollinations (direct browser URL)
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
  /** Index of the NEW message that should be typewriter-animated. */
  streamingIndex?: number;
}

/**
 * Typewriter component — renders plain text char-by-char to avoid
 * partial-markdown glitches, then notifies parent when done so the
 * parent can switch to fully-rendered ReactMarkdown.
 */
const TypewriterText = ({
  content,
  onComplete,
}: {
  content: string;
  onComplete: () => void;
}) => {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    // Start fresh whenever `content` changes
    indexRef.current = 0;
    doneRef.current = false;
    setDisplayed("");

    if (!content) return;

    const CHARS_PER_FRAME = 2; // tweak for speed

    const tick = () => {
      if (doneRef.current) return;
      if (indexRef.current >= content.length) {
        doneRef.current = true;
        onComplete();
        return;
      }
      indexRef.current = Math.min(indexRef.current + CHARS_PER_FRAME, content.length);
      setDisplayed(content.slice(0, indexRef.current));
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  return (
    <span className="whitespace-pre-wrap break-words">
      {displayed}
      {/* blinking cursor */}
      <span
        className="inline-block w-0.5 h-[1em] bg-primary ml-[1px] align-text-bottom animate-[blink_0.7s_step-end_infinite]"
        aria-hidden="true"
      />
    </span>
  );
};

/** Pollinations.ai image with skeleton loading + timeout + error fallback */
const GeneratedImage = ({ url }: { url: string }) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [retryKey, setRetryKey] = useState(0);

  // Pollinations sana model can take 30-90s; allow 90s before showing error.
  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => setStatus('error'), 90_000);
    return () => clearTimeout(timer);
  }, [status, retryKey]);

  return (
    <div className="mb-3 relative">
      {/* Loading skeleton */}
      {status === 'loading' && (
        <div className="w-full max-w-lg h-56 rounded-xl bg-muted/60 animate-pulse flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Sparkles className="w-6 h-6 animate-spin" />
            <span className="text-xs font-medium">Generating diagram… (may take ~20s)</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="w-full max-w-lg h-32 rounded-xl border border-dashed border-border flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageOff className="w-5 h-5" />
            <span className="text-xs">Image failed to generate</span>
            <button
              onClick={() => { setStatus('loading'); setRetryKey(k => k + 1); }}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        </div>
      )}

      {/* Actual image — hidden until loaded */}
      <img
        key={retryKey}
        src={url}
        alt="AI generated illustration"
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        className={cn(
          "w-full max-w-lg rounded-xl border shadow-md object-contain transition-opacity duration-500",
          status === 'loaded' ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
        )}
      />

      {status === 'loaded' && (
        <p className="text-[10px] text-muted-foreground/50 mt-1 flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5" /> AI generated · Pollinations
        </p>
      )}
    </div>
  );
};

export const ChatMessages = ({ messages, isLoading, streamingIndex }: ChatMessagesProps) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const tts = useSpeechSynthesis();
  /**
   * Tracks which messages have finished their typewriter animation.
   * Key = `${idx}:${content.length}` so that re-loaded history (same
   * index but content already set) is treated as already-done and
   * never re-animated.
   */
  const [animDone, setAnimDone] = useState<Set<string>>(new Set());

  const doneKey = (idx: number, content: string) => `${idx}:${content.length}`;

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleExport = (text: string, idx: number) => {
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studyflow-tutor-response-${idx + 1}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-4 max-w-4xl mx-auto w-full overflow-hidden">
      {messages.map((msg, idx) => {
        const key = doneKey(idx, msg.content);
        const isTargetMsg = streamingIndex === idx && msg.role === 'assistant';
        // Only animate if: this is the streaming target AND content has arrived AND animation hasn't finished yet
        const shouldAnimate = isTargetMsg && !!msg.content && !animDone.has(key);
        const showFormatted = msg.role === 'assistant' && (!!msg.content && !shouldAnimate);

        return (
          <div
            key={idx}
            className={cn(
              "flex gap-2 sm:gap-4 animate-fade-in w-full min-w-0",
              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}
            style={{ animationDelay: `${Math.min(idx, 5) * 40}ms` }}
          >
            {/* Avatar */}
            <Avatar className={cn(
              "w-8 h-8 sm:w-9 sm:h-9 shrink-0 border-2 shadow-sm",
              msg.role === 'assistant'
                ? "border-primary/20 bg-gradient-to-br from-primary/10 to-accent/10"
                : "border-border"
            )}>
              <AvatarFallback className={cn(msg.role === 'assistant' && "bg-transparent")}>
                {msg.role === 'assistant'
                  ? <StudyFlowLogo size="sm" variant="purple" />
                  : <User className="w-4 h-4 text-muted-foreground" />
                }
              </AvatarFallback>
            </Avatar>

            {/* Message content */}
            <div className={cn(
              "flex flex-col min-w-0 max-w-[calc(100%-2.5rem)] sm:max-w-[80%]",
              msg.role === 'user' ? "items-end" : "items-start"
            )}>
              {/* Image preview */}
              {msg.image_url && (
                <div className="mb-2 rounded-xl overflow-hidden border shadow-sm">
                  <ImagePreview
                    src={msg.image_url}
                    alt={msg.attachment_name || "Uploaded image"}
                    className="max-w-[200px] max-h-[200px] object-cover hover:opacity-90 transition-opacity"
                  />
                </div>
              )}

              {/* Attachment badge (non-image) */}
              {msg.attachment_name && !msg.image_url && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 bg-muted/50 px-3 py-1.5 rounded-full border">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[150px]">{msg.attachment_name}</span>
                </div>
              )}

              {/* Message bubble */}
              <div className={cn(
                "px-3 sm:px-4 py-3 rounded-2xl text-sm leading-relaxed w-full min-w-0 overflow-hidden",
                msg.role === 'user'
                  ? "gradient-primary text-primary-foreground rounded-br-md shadow-lg"
                  : "bg-muted/50 text-foreground rounded-bl-md border border-border/50"
              )}>
                {msg.role === 'assistant' ? (
                  <div className="flex flex-col gap-2">
                    {/* AI-generated image (Pollinations) */}
                    {msg.generated_image_url && (
                      <GeneratedImage url={msg.generated_image_url} />
                    )}

                    {/* Responding label during typewriter */}
                    {shouldAnimate && (
                      <div className="flex items-center gap-1.5 text-xs text-primary/70 mb-1 animate-pulse">
                        <Sparkles className="w-3 h-3" />
                        <span>StudyFlow is responding…</span>
                      </div>
                    )}

                    {shouldAnimate ? (
                      <TypewriterText
                        content={msg.content}
                        onComplete={() => setAnimDone(prev => new Set(prev).add(key))}
                      />
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 break-words overflow-wrap-anywhere">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}

                    {/* Copy / Export / TTS — only once content is present and animation done (or never animated) */}
                    {msg.content && !shouldAnimate && (
                      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/50">
                        {/* Audio Read-Aloud Button */}
                        {tts.isSupported && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                if (tts.isSpeaking && tts.activeMessageId === String(idx)) {
                                  tts.stop();
                                } else {
                                  tts.speak(msg.content, String(idx));
                                }
                              }}
                              className={cn(
                                "flex items-center gap-1.5 text-xs transition-colors p-1 rounded",
                                tts.isSpeaking && tts.activeMessageId === String(idx)
                                  ? "text-primary font-semibold"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                              title={
                                tts.isSpeaking && tts.activeMessageId === String(idx)
                                  ? "Stop reading"
                                  : "Listen to explanation"
                              }
                            >
                              {tts.isSpeaking && tts.activeMessageId === String(idx) ? (
                                <>
                                  <VolumeX className="w-3.5 h-3.5 text-primary animate-pulse" />
                                  <span className="text-primary">Stop</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3.5 h-3.5" />
                                  <span>Listen</span>
                                </>
                              )}
                            </button>

                            {/* Playback speed toggle */}
                            {tts.isSpeaking && tts.activeMessageId === String(idx) && (
                              <button
                                onClick={() => {
                                  const speeds = [1.0, 1.25, 1.5, 2.0];
                                  const currentIdx = speeds.indexOf(tts.rate);
                                  const nextSpeed = speeds[(currentIdx + 1) % speeds.length];
                                  tts.setRate(nextSpeed);
                                }}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono font-medium hover:bg-primary/20 transition-colors"
                                title="Change voice speed"
                              >
                                {tts.rate}x
                              </button>
                            )}
                          </div>
                        )}

                        <button
                          onClick={() => handleCopy(msg.content, idx)}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors p-1"
                          title="Copy Response"
                        >
                          {copiedIndex === idx
                            ? <Check className="w-3.5 h-3.5 text-green-500" />
                            : <Copy className="w-3.5 h-3.5" />}
                          {copiedIndex === idx ? "Copied" : "Copy"}
                        </button>
                        <button
                          onClick={() => handleExport(msg.content, idx)}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors p-1"
                          title="Download as Markdown"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Export
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Thinking dots — visible while API call is in-flight (no content yet) */}
      {isLoading && (
        <div className="flex gap-4 flex-row animate-fade-in">
          <Avatar className="w-9 h-9 shrink-0 border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-accent/10">
            <AvatarFallback className="bg-transparent">
              <StudyFlowLogo size="sm" variant="purple" className="animate-pulse" />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 rounded-2xl rounded-bl-md border border-border/50">
              <span className="text-sm text-muted-foreground">StudyFlow is thinking</span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
