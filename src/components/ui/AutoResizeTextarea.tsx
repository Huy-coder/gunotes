"use client";

import React, { useCallback, useEffect, useRef } from "react";

type AutoResizeTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function AutoResizeTextarea({
  value,
  onChange,
  className = "",
  ...rest
}: AutoResizeTextareaProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let active = true;
    let rafId = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (active) resize();
      });
    });
    observer.observe(el);

    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(() => {
        if (active) resize();
      });
    }

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [resize]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => {
        resize();
        onChange?.(e);
      }}
      className={`resize-none overflow-hidden ${className}`}
      {...rest}
    />
  );
}
