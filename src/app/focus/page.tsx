"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CloudRain,
  Coffee,
  Keyboard,
  Pause,
  Play,
  Plus,
  RotateCcw,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAppStore, type FocusModeDuration } from "@/store/useAppStore";

function formatClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function FocusPage() {
  const user = useAppStore((s) => s.user);
  const binders = useAppStore((s) => s.binders);
  const activeBinderId = useAppStore((s) => s.activeBinderId);
  const focusMode = useAppStore((s) => s.focusMode);
  const secondsLeft = useAppStore((s) => s.secondsLeft);
  const isTimerRunning = useAppStore((s) => s.isTimerRunning);
  const focusTasks = useAppStore((s) => s.focusTasks);
  const ambientVolumes = useAppStore((s) => s.ambientVolumes);

  const setActiveBinderId = useAppStore((s) => s.setActiveBinderId);
  const setFocusMode = useAppStore((s) => s.setFocusMode);
  const toggleTimer = useAppStore((s) => s.toggleTimer);
  const resetTimer = useAppStore((s) => s.resetTimer);
  const toggleFocusTask = useAppStore((s) => s.toggleFocusTask);
  const addFocusTask = useAppStore((s) => s.addFocusTask);
  const setAmbientVolume = useAppStore((s) => s.setAmbientVolume);

  const [taskInput, setTaskInput] = useState("");

  const totalSeconds = focusMode * 60;
  const progress = Math.max(0, Math.min(1, secondsLeft / totalSeconds));
  const radius = 104;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const todayH = Math.floor(user.todayFocusMinutes / 60);
  const todayM = user.todayFocusMinutes % 60;

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim()) return;
    addFocusTask(taskInput);
    setTaskInput("");
  };

  return (
    <AppShell>
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-4xl flex-col justify-between px-4 pt-5 pb-6 sm:px-8 sm:pt-7">
        {/* Top Minimal Bar */}
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link
              href="/workspace"
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Quay lại</span>
            </Link>

            <select
              value={activeBinderId}
              onChange={(e) => setActiveBinderId(e.target.value)}
              className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium outline-none"
            >
              {binders.length === 0 ? (
                <option value="">Chưa có sổ môn học</option>
              ) : (
                binders.map((b) => (
                  <option key={b.id} value={b.id}>
                    Đang học: {b.title}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-1.5 font-mono text-xs text-[var(--ink-muted)]">
            Hôm nay:{" "}
            <strong className="text-[var(--ink-primary)]">
              {todayH}h {todayM}p
            </strong>
          </div>
        </header>

        {/* Centerpiece Circular Ring Timer */}
        <section className="my-8 flex flex-col items-center text-center">
          <div className="inline-flex rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-1">
            {(
              [
                { id: 25, label: "Tập trung 25p" },
                { id: 50, label: "Học sâu 50p" },
                { id: 5, label: "Nghỉ ngắn 5p" },
              ] as Array<{ id: FocusModeDuration; label: string }>
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setFocusMode(m.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  focusMode === m.id
                    ? "bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="relative mt-8 flex h-64 w-64 items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 240 240">
              <circle
                cx="120"
                cy="120"
                r={radius}
                fill="none"
                stroke="var(--border-hairline)"
                strokeWidth="4"
              />
              <circle
                cx="120"
                cy="120"
                r={radius}
                fill="none"
                stroke="var(--accent-ring)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="transition-all duration-500"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-5xl font-bold tracking-tight tabular-nums">
                {formatClock(secondsLeft)}
              </span>
              <span className="mt-2 font-mono text-[10px] tracking-widest text-[var(--ink-muted)] uppercase">
                {isTimerRunning ? "ĐANG TẬP TRUNG" : "SẴN SÀNG"}
              </span>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTimer}
              className="flex items-center gap-2 rounded-full bg-[var(--accent-primary)] px-7 py-3 text-sm font-semibold text-[var(--accent-primary-fg)] transition hover:opacity-90"
            >
              {isTimerRunning ? (
                <>
                  <Pause className="h-4 w-4" />
                  <span>Tạm dừng</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Bắt đầu phiên học</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={resetTimer}
              title="Đặt lại đồng hồ"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* Bottom Dual Companion Dock */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Task Checklist Card */}
          <div className="paper-shadow rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-xs font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
                Mục tiêu phiên này
              </h2>
              <span className="font-mono text-xs text-[var(--ink-muted)]">
                {focusTasks.filter((t) => t.done).length}/{focusTasks.length}
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {focusTasks.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--border-hairline)] px-3 py-3 text-center text-xs text-[var(--ink-muted)]">
                  Chưa có mục tiêu nào cho phiên này. Thêm mục tiêu nhỏ bên dưới để bắt đầu nhé!
                </p>
              ) : (
                focusTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => toggleFocusTask(task.id)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-sm transition hover:bg-[var(--bg-desk)]"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                        task.done
                          ? "border-[var(--accent-ring)] bg-[var(--accent-ring)] text-white"
                          : "border-[var(--ink-muted)]"
                      }`}
                    >
                      {task.done && <Check className="h-3 w-3" />}
                    </span>
                    <span
                      className={
                        task.done
                          ? "text-[var(--ink-muted)] line-through"
                          : "text-[var(--ink-primary)]"
                      }
                    >
                      {task.label}
                    </span>
                  </button>
                ))
              )}
            </div>

            <form onSubmit={handleAddTask} className="mt-3 flex gap-2">
              <input
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Thêm mục tiêu nhỏ..."
                className="flex-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs outline-none focus:border-[var(--ink-primary)]"
              />
              <button
                type="submit"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] hover:border-[var(--ink-primary)]"
                aria-label="Thêm mục tiêu"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>

          {/* Ambient Sound Mixer Card */}
          <div className="paper-shadow rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-xs font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
                Âm thanh nền (Ambient)
              </h2>
              <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                Web Audio Synth
              </span>
            </div>

            <div className="mt-4 space-y-4">
              {(
                [
                  {
                    key: "rain",
                    label: "Tiếng mưa nhẹ",
                    icon: CloudRain,
                  },
                  {
                    key: "cafe",
                    label: "Quán cafe yên tĩnh",
                    icon: Coffee,
                  },
                  {
                    key: "keys",
                    label: "Gió đêm thư viện",
                    icon: Keyboard,
                  },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const val = ambientVolumes[item.key];
                return (
                  <div key={item.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-medium">
                        <Icon className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                        {item.label}
                      </span>
                      <span className="font-mono text-[11px] text-[var(--ink-muted)] tabular-nums">
                        {val}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={val}
                      onChange={(e) =>
                        setAmbientVolume(item.key, Number(e.target.value))
                      }
                      className="h-1.5 w-full cursor-pointer accent-[var(--accent-ring)]"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
