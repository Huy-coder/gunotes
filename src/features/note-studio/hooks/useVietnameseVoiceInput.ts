"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  isDuplicateAndroidChunk,
  VIETNAMESE_SPEECH_LANG,
} from "@/lib/speech/vietnamese-stt";

interface SpeechAlternativeLike {
  transcript: string;
}

interface SpeechResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechAlternativeLike;
}

interface SpeechResultEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechResultLike;
  };
}

interface SpeechErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechResultEventLike) => void) | null;
  onerror: ((event: SpeechErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function useVietnameseVoiceInput({
  noteId,
  onFinalTranscript,
  onToast,
}: {
  noteId: string;
  onFinalTranscript: (blockId: string, chunk: string) => void;
  onToast: (msg: string) => void;
}) {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceBlockId, setVoiceBlockId] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const shouldKeepListeningRef = useRef(false);
  const activeBlockIdRef = useRef<string | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const lastChunkRef = useRef<{ text: string; ts: number }>({
    text: "",
    ts: 0,
  });

  const onFinalRef = useRef(onFinalTranscript);
  onFinalRef.current = onFinalTranscript;
  const onToastRef = useRef(onToast);
  onToastRef.current = onToast;

  const releaseMediaResources = useCallback(() => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      mediaRecorderRef.current = null;
    }
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }
    audioChunksRef.current = [];
  }, []);

  const stopListening = useCallback(() => {
    shouldKeepListeningRef.current = false;
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        releaseMediaResources();
      }
    } else {
      releaseMediaResources();
      activeBlockIdRef.current = null;
      setVoiceBlockId(null);
    }
    setIsListening(false);
    setInterimTranscript("");
  }, [releaseMediaResources]);

  useEffect(() => {
    return () => {
      shouldKeepListeningRef.current = false;
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      releaseMediaResources();
    };
  }, [releaseMediaResources]);

  useEffect(() => {
    stopListening();
  }, [noteId, stopListening]);

  const startWebSpeech = useCallback((blockId: string) => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return false;

    shouldKeepListeningRef.current = true;
    activeBlockIdRef.current = blockId;
    setVoiceBlockId(blockId);
    setIsListening(true);
    setInterimTranscript("");

    const launchInstance = () => {
      if (!shouldKeepListeningRef.current) return;
      const rec = new Ctor();
      rec.lang = VIETNAMESE_SPEECH_LANG;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onresult = (ev) => {
        let interim = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const result = ev.results[i];
          const text = result?.[0]?.transcript ?? "";
          if (!text) continue;

          if (result.isFinal) {
            const now = Date.now();
            if (
              !isDuplicateAndroidChunk(
                lastChunkRef.current.text,
                text,
                now - lastChunkRef.current.ts
              )
            ) {
              lastChunkRef.current = { text, ts: now };
              const targetId = activeBlockIdRef.current;
              if (targetId) {
                onFinalRef.current(targetId, text);
              }
            }
          } else {
            interim += `${text} `;
          }
        }
        setInterimTranscript(interim.trim());
      };

      rec.onerror = (ev) => {
        if (ev.error === "no-speech" || ev.error === "aborted") {
          return;
        }
        if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
          shouldKeepListeningRef.current = false;
          setIsListening(false);
          setVoiceBlockId(null);
          setInterimTranscript("");
          onToastRef.current(
            "Vui lòng cấp quyền Micro cho trình duyệt để ghi chú giọng nói."
          );
          return;
        }
        if (ev.error === "audio-capture") {
          shouldKeepListeningRef.current = false;
          setIsListening(false);
          setVoiceBlockId(null);
          setInterimTranscript("");
          onToastRef.current("Không tìm thấy micro khả dụng trên thiết bị.");
        }
      };

      rec.onend = () => {
        setInterimTranscript("");
        if (!shouldKeepListeningRef.current) {
          setIsListening(false);
          setVoiceBlockId(null);
          activeBlockIdRef.current = null;
          return;
        }
        restartTimerRef.current = window.setTimeout(() => {
          if (shouldKeepListeningRef.current) {
            launchInstance();
          }
        }, 180);
      };

      recognitionRef.current = rec;
      try {
        rec.start();
      } catch {
        shouldKeepListeningRef.current = false;
        setIsListening(false);
        setVoiceBlockId(null);
        onToastRef.current("Không thể khởi động nhận diện giọng nói.");
      }
    };

    launchInstance();
    onToastRef.current("Đang nghe Tiếng Việt (vi-VN) — hãy bắt đầu nói!");
    return true;
  }, []);

  const startMediaRecorderFallback = useCallback(
    async (blockId: string) => {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      ) {
        onToastRef.current(
          "Trình duyệt này chưa hỗ trợ ghi âm giọng nói (Speech-to-Text)."
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        mediaStreamRef.current = stream;
        audioChunksRef.current = [];
        activeBlockIdRef.current = blockId;
        setVoiceBlockId(blockId);
        setIsListening(true);
        setInterimTranscript("Đang thu âm Tiếng Việt (vi-VN)...");

        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) {
            audioChunksRef.current.push(ev.data);
          }
        };

        recorder.onstop = async () => {
          const chunks = [...audioChunksRef.current];
          const targetId = activeBlockIdRef.current;
          const mime = recorder.mimeType || "audio/webm";

          if (mediaStreamRef.current) {
            for (const t of mediaStreamRef.current.getTracks()) t.stop();
            mediaStreamRef.current = null;
          }
          mediaRecorderRef.current = null;
          audioChunksRef.current = [];
          setIsListening(false);
          setInterimTranscript("");

          if (chunks.length === 0 || !targetId) {
            activeBlockIdRef.current = null;
            setVoiceBlockId(null);
            return;
          }

          setIsTranscribing(true);
          try {
            const blob = new Blob(chunks, { type: mime });
            const fd = new FormData();
            fd.append("audio", blob, "voice-note.webm");
            const res = await fetch("/api/ai/transcribe", {
              method: "POST",
              body: fd,
            });
            const json = (await res.json()) as {
              transcript?: string;
              error?: string;
            };
            if (!res.ok) {
              onToastRef.current(
                json.error ?? "Không chép lời được đoạn ghi âm."
              );
            } else if (json.transcript?.trim()) {
              onFinalRef.current(targetId, json.transcript.trim());
              onToastRef.current("Đã chèn nội dung giọng nói tiếng Việt!");
            } else {
              onToastRef.current("Không nghe rõ giọng nói trong đoạn thu âm.");
            }
          } catch {
            onToastRef.current("Lỗi kết nối khi chép lời âm thanh.");
          } finally {
            setIsTranscribing(false);
            activeBlockIdRef.current = null;
            setVoiceBlockId(null);
          }
        };

        recorder.start();
        onToastRef.current(
          "Đang thu âm Tiếng Việt — bấm Dừng khi nói xong!"
        );
      } catch {
        releaseMediaResources();
        setIsListening(false);
        setVoiceBlockId(null);
        onToastRef.current(
          "Vui lòng cấp quyền Micro để ghi chú bằng giọng nói."
        );
      }
    },
    [releaseMediaResources]
  );

  const startForBlock = useCallback(
    (blockId: string) => {
      if (isListening || isTranscribing) {
        stopListening();
      }
      if (!startWebSpeech(blockId)) {
        void startMediaRecorderFallback(blockId);
      }
    },
    [
      isListening,
      isTranscribing,
      stopListening,
      startWebSpeech,
      startMediaRecorderFallback,
    ]
  );

  return {
    isListening,
    isTranscribing,
    voiceBlockId,
    interimTranscript,
    startForBlock,
    stopListening,
  };
}
