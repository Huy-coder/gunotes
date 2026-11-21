"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";

/**
 * Synthesizes gentle ambient study soundscapes via Web Audio API so zero external
 * audio URLs can break or fail CORS. Starts lazily once any channel > 0.
 */
export function AmbientAudioEngine() {
  const ambientVolumes = useAppStore((s) => s.ambientVolumes);
  const ctxRef = useRef<AudioContext | null>(null);
  const rainGainRef = useRef<GainNode | null>(null);
  const cafeGainRef = useRef<GainNode | null>(null);
  const keysGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    const anyActive =
      ambientVolumes.rain > 0 ||
      ambientVolumes.cafe > 0 ||
      ambientVolumes.keys > 0;

    if (!anyActive && !ctxRef.current) return;

    if (!ctxRef.current && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      ctxRef.current = ctx;

      // Shared 2-second filtered noise buffer
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.03 * white) / 1.03;
        lastOut = output[i];
      }

      // 1. Rain channel (bandpass warm hiss)
      const rainSource = ctx.createBufferSource();
      rainSource.buffer = noiseBuffer;
      rainSource.loop = true;
      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = "bandpass";
      rainFilter.frequency.value = 1100;
      rainFilter.Q.value = 0.7;
      const rainGain = ctx.createGain();
      rainGain.gain.value = 0;
      rainSource.connect(rainFilter).connect(rainGain).connect(ctx.destination);
      rainSource.start();
      rainGainRef.current = rainGain;

      // 2. Cafe murmur channel (warm lowpass rumble)
      const cafeSource = ctx.createBufferSource();
      cafeSource.buffer = noiseBuffer;
      cafeSource.loop = true;
      const cafeFilter = ctx.createBiquadFilter();
      cafeFilter.type = "lowpass";
      cafeFilter.frequency.value = 380;
      const cafeGain = ctx.createGain();
      cafeGain.gain.value = 0;
      cafeSource.connect(cafeFilter).connect(cafeGain).connect(ctx.destination);
      cafeSource.start();
      cafeGainRef.current = cafeGain;

      // 3. Soft focus hum channel (gentle highpass breeze)
      const keysSource = ctx.createBufferSource();
      keysSource.buffer = noiseBuffer;
      keysSource.loop = true;
      const keysFilter = ctx.createBiquadFilter();
      keysFilter.type = "bandpass";
      keysFilter.frequency.value = 2100;
      keysFilter.Q.value = 1.4;
      const keysGain = ctx.createGain();
      keysGain.gain.value = 0;
      keysSource.connect(keysFilter).connect(keysGain).connect(ctx.destination);
      keysSource.start();
      keysGainRef.current = keysGain;
    }

    const ctx = ctxRef.current;
    if (!ctx) return;

    if (anyActive && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    if (rainGainRef.current) {
      rainGainRef.current.gain.setTargetAtTime(
        (ambientVolumes.rain / 100) * 0.14,
        now,
        0.08
      );
    }
    if (cafeGainRef.current) {
      cafeGainRef.current.gain.setTargetAtTime(
        (ambientVolumes.cafe / 100) * 0.22,
        now,
        0.08
      );
    }
    if (keysGainRef.current) {
      keysGainRef.current.gain.setTargetAtTime(
        (ambientVolumes.keys / 100) * 0.06,
        now,
        0.08
      );
    }
  }, [ambientVolumes]);

  useEffect(() => {
    return () => {
      if (ctxRef.current) {
        ctxRef.current.close().catch(() => {});
        ctxRef.current = null;
      }
    };
  }, []);

  return null;
}
