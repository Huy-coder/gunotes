"use client";

import React, { useEffect, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_STORAGE_KEY = "gunotes-pwa-install-dismissed";

export function PwaRegistrar() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;

    if (!isStandalone) {
      try {
        setDismissed(sessionStorage.getItem(DISMISS_STORAGE_KEY) === "1");
      } catch {
        setDismissed(false);
      }
    }

    let cleanupSw = () => {};
    if ("serviceWorker" in navigator) {
      const hadController = Boolean(navigator.serviceWorker.controller);

      const onControllerChange = () => {
        if (hadController) {
          setUpdateReady(true);
        }
      };

      navigator.serviceWorker.addEventListener(
        "controllerchange",
        onControllerChange
      );

      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          void reg.update().catch(() => {});
          reg.addEventListener("updatefound", () => {
            const worker = reg.installing;
            if (!worker) return;
            worker.addEventListener("statechange", () => {
              if (worker.state === "installed" && hadController) {
                setUpdateReady(true);
              }
            });
          });
        })
        .catch(() => {});

      cleanupSw = () => {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          onControllerChange
        );
      };
    }

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      try {
        if (
          sessionStorage.getItem(DISMISS_STORAGE_KEY) !== "1" &&
          !isStandalone
        ) {
          setDismissed(false);
        }
      } catch {
        if (!isStandalone) setDismissed(false);
      }
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setDismissed(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      cleanupSw();
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
        setDismissed(true);
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_STORAGE_KEY, "1");
    } catch {
      // Ignore storage quota errors
    }
  };

  if (updateReady) {
    return (
      <div className="no-print fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-full border border-[var(--ink-primary)] bg-[var(--bg-elevated)]/95 p-1 pl-3.5 shadow-xl backdrop-blur-md lg:bottom-6 lg:left-6">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-primary)]"
        >
          <RefreshCw className="h-3.5 w-3.5 text-[var(--accent-ring)]" />
          <span>Đã cập nhật GuNotes — Tải lại</span>
        </button>
        <button
          type="button"
          onClick={() => setUpdateReady(false)}
          aria-label="Đóng thông báo cập nhật"
          className="rounded-full p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)]"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="no-print fixed bottom-20 left-4 z-40 flex items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/95 p-1 pl-3 shadow-lg backdrop-blur-md lg:bottom-6 lg:left-6">
      <button
        type="button"
        disabled={installing}
        onClick={() => void handleInstall()}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-primary)] transition hover:opacity-80 disabled:opacity-60"
      >
        <Download className="h-3.5 w-3.5 text-[var(--accent-ring)]" />
        <span>{installing ? "Đang cài..." : "Cài đặt GuNotes"}</span>
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Đóng gợi ý cài đặt"
        className="rounded-full p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)]"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
