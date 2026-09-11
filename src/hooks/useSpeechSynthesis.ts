import { useState, useEffect, useRef, useCallback } from "react";

export interface UseSpeechSynthesisReturn {
  speak: (text: string, messageId?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  activeMessageId: string | null;
  rate: number;
  setRate: (rate: number) => void;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice | null) => void;
}

/**
 * Cleans Markdown formatting so speech synthesis sounds natural and conversational.
 */
function cleanMarkdownForSpeech(markdown: string): string {
  if (!markdown) return "";
  return markdown
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, "Code block omitted.")
    // Remove inline code
    .replace(/`([^`]+)`/g, "$1")
    // Remove markdown links but keep text [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove image tags ![alt](url)
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    // Remove headers (# Header -> Header)
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold/italic markers (**bold** -> bold, *italic* -> italic)
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    // Remove blockquotes (> Quote -> Quote)
    .replace(/^>\s+/gm, "")
    // Remove bullet points / dashes
    .replace(/^[\s]*[-*+]\s+/gm, "")
    // Remove numbered list prefixes
    .replace(/^\d+\.\s+/gm, "")
    // Replace multiple newlines or spaces
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Splits text into natural sentence chunks to prevent Android WebView
 * speech synthesis timeouts on long texts.
 */
function splitIntoSentenceChunks(text: string): string[] {
  const matches = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (!matches) return [text];
  return matches
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [rate, setRate] = useState(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const currentChunksRef = useRef<string[]>([]);
  const currentChunkIndexRef = useRef<number>(0);
  const isCancelledRef = useRef<boolean>(false);
  const rateRef = useRef<number>(rate);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(selectedVoice);

  rateRef.current = rate;
  selectedVoiceRef.current = selectedVoice;

  // Load and cache voices
  useEffect(() => {
    if (!isSupported) return;

    const updateVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
        // Find best default English voice
        const englishVoices = available.filter((v) => v.lang.startsWith("en"));
        const preferred =
          englishVoices.find((v) => /natural|google|samantha|karen|daniel/i.test(v.name)) ||
          englishVoices[0] ||
          available[0];
        setSelectedVoice((prev) => prev || preferred);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (isSupported) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isSupported]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    isCancelledRef.current = true;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setActiveMessageId(null);
    currentChunksRef.current = [];
    currentChunkIndexRef.current = 0;
  }, [isSupported]);

  const speakNextChunk = useCallback(() => {
    if (isCancelledRef.current || !isSupported) return;

    const chunks = currentChunksRef.current;
    const index = currentChunkIndexRef.current;

    if (index >= chunks.length) {
      // Completed all sentences
      setIsSpeaking(false);
      setIsPaused(false);
      setActiveMessageId(null);
      return;
    }

    const chunkText = chunks[index];
    const utterance = new SpeechSynthesisUtterance(chunkText);
    utterance.rate = rateRef.current;
    if (selectedVoiceRef.current) {
      utterance.voice = selectedVoiceRef.current;
    }

    utterance.onend = () => {
      if (!isCancelledRef.current) {
        currentChunkIndexRef.current += 1;
        speakNextChunk();
      }
    };

    utterance.onerror = (e) => {
      if (e.error !== "canceled" && e.error !== "interrupted") {
        console.warn("Speech synthesis error:", e);
      }
      setIsSpeaking(false);
      setIsPaused(false);
      setActiveMessageId(null);
    };

    window.speechSynthesis.speak(utterance);
  }, [isSupported]);

  const speak = useCallback(
    (text: string, messageId?: string) => {
      if (!isSupported || !text) return;

      // If already speaking this message, toggle stop
      if (isSpeaking && activeMessageId === (messageId || "current")) {
        stop();
        return;
      }

      // Stop any active speech
      stop();

      const cleaned = cleanMarkdownForSpeech(text);
      if (!cleaned) return;

      const chunks = splitIntoSentenceChunks(cleaned);
      if (chunks.length === 0) return;

      isCancelledRef.current = false;
      currentChunksRef.current = chunks;
      currentChunkIndexRef.current = 0;
      setActiveMessageId(messageId || "current");
      setIsSpeaking(true);
      setIsPaused(false);

      speakNextChunk();
    },
    [isSupported, isSpeaking, activeMessageId, stop, speakNextChunk]
  );

  const pause = useCallback(() => {
    if (!isSupported || !isSpeaking) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, [isSupported, isSpeaking]);

  const resume = useCallback(() => {
    if (!isSupported || !isPaused) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, [isSupported, isPaused]);

  return {
    speak,
    pause,
    resume,
    stop,
    isSpeaking,
    isPaused,
    activeMessageId,
    rate,
    setRate,
    isSupported,
    voices,
    selectedVoice,
    setSelectedVoice,
  };
}
