"use client";

import React, { useMemo } from "react";
import { CalendarDays, CloudOff, RefreshCw } from "lucide-react";
import { getLocalDateKey, isCardDueNow } from "@/lib/srs/sm2";
import { useAppStore } from "@/store/useAppStore";

export function StudyHeatmapCard() {
  const dailyStudyLog = useAppStore((s) => s.dailyStudyLog);
  const flashcards = useAppStore((s) => s.flashcards);
  const pendingOfflineCount = useAppStore((s) => s.pendingOfflineCount);
  const flushPendingOfflineSync = useAppStore(
    (s) => s.flushPendingOfflineSync
  );

  // Build 12 weeks (84 days) grid ending today
  const { weeks, activeDaysCount, forecast } = useMemo(() => {
    const today = new Date();
    const cells: Array<{ key: string; minutes: number }> = [];
    let active = 0;

    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = getLocalDateKey(d);
      const mins = dailyStudyLog[key] ?? 0;
      if (mins > 0) active += 1;
      cells.push({ key, minutes: mins });
    }

    const weekCols: Array<Array<{ key: string; minutes: number }>> = [];
    for (let c = 0; c < cells.length; c += 7) {
      weekCols.push(cells.slice(c, c + 7));
    }

    const nowMs = Date.now();
    const endTomorrow = nowMs + 86400000;
    const end7Days = nowMs + 7 * 86400000;

    let dueToday = 0;
    let dueTomorrow = 0;
    let dueWeek = 0;

    for (const fc of flashcards) {
      if (isCardDueNow(fc, nowMs)) {
        dueToday += 1;
        dueWeek += 1;
      } else if (fc.dueAtIso) {
        const ts = Date.parse(fc.dueAtIso);
        if (!Number.isNaN(ts)) {
          if (ts <= endTomorrow) dueTomorrow += 1;
          if (ts <= end7Days) dueWeek += 1;
        }
      }
    }

    return {
      weeks: weekCols,
      activeDaysCount: active,
      forecast: { dueToday, dueTomorrow, dueWeek },
    };
  }, [dailyStudyLog, flashcards]);

  const getCellStyle = (mins: number): React.CSSProperties => {
    if (mins <= 0) {
      return { backgroundColor: "var(--bg-desk)" };
    }
    if (mins < 25) {
      return { backgroundColor: "var(--sem-ex-bg)", opacity: 0.85 };
    }
    if (mins < 50) {
      return { backgroundColor: "var(--hl-green)" };
    }
    return { backgroundColor: "var(--accent-ring)" };
  };

  return (
    <section className="paper-shadow mt-6 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[var(--ink-muted)]" />
          <h2 className="font-mono text-xs font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
            Nhịp độ học tập 12 tuần & Lịch ôn SM-2
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          {pendingOfflineCount > 0 && (
            <button
              type="button"
              onClick={() => void flushPendingOfflineSync()}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--sem-trap-border)] bg-[var(--sem-trap-bg)] px-2.5 py-0.5 text-[10px] font-semibold"
              title="Bấm để thử đồng bộ lại hàng đợi Offline"
            >
              <CloudOff className="h-3 w-3" />
              <span>{pendingOfflineCount} thay đổi chờ mạng</span>
              <RefreshCw className="h-2.5 w-2.5" />
            </button>
          )}
          <span className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 py-0.5 text-[var(--ink-muted)]">
            {activeDaysCount} ngày có học
          </span>
        </div>
      </div>

      <div className="mt-3.5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* 12x7 Heatmap Grid */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {weeks.map((col, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1.5">
              {col.map((cell) => (
                <div
                  key={cell.key}
                  title={`${cell.key}: ${cell.minutes} phút tập trung`}
                  className="h-3 w-3 rounded-[3px] border border-[var(--border-hairline)]/60 sm:h-3.5 sm:w-3.5"
                  style={getCellStyle(cell.minutes)}
                />
              ))}
            </div>
          ))}
        </div>

        {/* 7-day SRS Forecast */}
        <div className="grid shrink-0 grid-cols-3 gap-2 font-mono text-xs">
          <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-2 text-center">
            <div className="text-[10px] text-[var(--ink-muted)]">Hôm nay</div>
            <div className="mt-0.5 text-sm font-bold">{forecast.dueToday}</div>
          </div>
          <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-2 text-center">
            <div className="text-[10px] text-[var(--ink-muted)]">Ngày mai</div>
            <div className="mt-0.5 text-sm font-bold">
              {forecast.dueTomorrow}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-2 text-center">
            <div className="text-[10px] text-[var(--ink-muted)]">7 ngày</div>
            <div className="mt-0.5 text-sm font-bold">{forecast.dueWeek}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
