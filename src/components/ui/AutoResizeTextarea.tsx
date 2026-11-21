"use client";

import React, { useCallback, useEffect, useRef } from "react";

type AutoResizeTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const AutoResizeTextarea = React.forwardRef<
  HTMLTextAreaElement,
  AutoResizeTextareaProps
>(function AutoResizeTextarea({ value, onChange, className = "", ...rest }, forwardedRef) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  const assignRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef]
  );

  const resize = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  useEffect(() => {
    const el = innerRef.current;
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
      ref={assignRef}
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
});
