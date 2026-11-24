"use client";

import React, { useState } from "react";
import { Check, PenTool, Trash2, Undo2 } from "lucide-react";
import type { InkStroke } from "@/types/study";

const INK_PALETTE = [
  { id: "#1f1e1b", label: "Mực đen", width: 3.5 },
  { id: "#D93829", label: "Bút đỏ", width: 3.5 },
  { id: "#2563EB", label: "Xanh", width: 3.5 },
  { id: "rgba(250, 204, 21, 0.45)", label: "Dạ quang", width: 14 },
];

function pointsToSvgPath(points: Array<[number, number]>): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const [x, y] = points[0];
    return `M ${x} ${y} L ${x + 0.5} ${y + 0.5}`;
  }
  return points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
}

export function PaperInkLayer({
  inkMode,
  strokes,
  onChangeStrokes,
  onCloseInkMode,
}: {
  inkMode: boolean;
  strokes: InkStroke[];
  onChangeStrokes: (next: InkStroke[]) => void;
  onCloseInkMode: () => void;
}) {
  const [activeTool, setActiveTool] = useState(0);
  const [draftStroke, setDraftStroke] = useState<InkStroke | null>(null);

  const tool = INK_PALETTE[activeTool] ?? INK_PALETTE[0];

  const getPoint = (e: React.PointerEvent<SVGSVGElement>): [number, number] => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(1000, ((e.clientX - rect.left) / Math.max(1, rect.width)) * 1000)
    );
    const y = Math.max(
      0,
      Math.min(1000, ((e.clientY - rect.top) / Math.max(1, rect.height)) * 1000)
    );
    return [x, y];
  };

  return (
    <>
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        aria-hidden={!inkMode}
        onPointerDown={(e) => {
          if (!inkMode) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setDraftStroke({
            id: `ink-${Date.now()}`,
            color: tool.id,
            width: tool.width,
            points: [getPoint(e)],
          });
        }}
        onPointerMove={(e) => {
          if (!inkMode || !draftStroke) return;
          const pt = getPoint(e);
          setDraftStroke((cur) =>
            cur ? { ...cur, points: [...cur.points, pt] } : cur
          );
        }}
        onPointerUp={() => {
          if (!inkMode || !draftStroke) return;
          onChangeStrokes([...strokes, draftStroke]);
          setDraftStroke(null);
        }}
        className={`absolute inset-0 z-10 h-full w-full rounded-[20px] ${
          inkMode ? "cursor-crosshair touch-none" : "pointer-events-none"
        }`}
      >
        {strokes.map((st) => (
          <path
            key={st.id}
            d={pointsToSvgPath(st.points)}
            fill="none"
            stroke={st.color}
            strokeWidth={st.width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {draftStroke && (
          <path
            d={pointsToSvgPath(draftStroke.points)}
            fill="none"
            stroke={draftStroke.color}
            strokeWidth={draftStroke.width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>

      {inkMode && (
        <div
          data-highlight-ui="true"
          className="no-print pointer-events-none fixed right-0 bottom-20 left-0 z-40 flex justify-center px-3 lg:left-[232px]"
        >
          <div className="paper-shadow pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-[var(--ink-primary)] bg-[var(--bg-elevated)]/98 px-3.5 py-2 backdrop-blur-md">
            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[var(--ink-primary)] uppercase">
              <PenTool className="h-3 w-3" />
              <span>Vẽ tay lên giấy:</span>
            </span>
            <div className="flex items-center gap-1.5">
              {INK_PALETTE.map((item, idx) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setActiveTool(idx)}
                  className={`min-h-[30px] rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold transition ${
                    activeTool === idx
                      ? "border-[var(--ink-primary)] ring-2 ring-[var(--ink-primary)]/20"
                      : "border-[var(--border-hairline)]"
                  }`}
                  style={{
                    backgroundColor:
                      idx === 3 ? "var(--hl-yellow)" : "var(--bg-paper)",
                    color: idx === 3 ? "#1f1e1b" : item.id,
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={strokes.length === 0}
              onClick={() => onChangeStrokes(strokes.slice(0, -1))}
              className="inline-flex min-h-[30px] items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2.5 py-0.5 font-mono text-[10px] font-semibold disabled:opacity-40"
            >
              <Undo2 className="h-3 w-3" />
              <span>Hoàn tác nét</span>
            </button>
            <button
              type="button"
              disabled={strokes.length === 0}
              onClick={() => onChangeStrokes([])}
              className="inline-flex min-h-[30px] items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2.5 py-0.5 font-mono text-[10px] font-semibold disabled:opacity-40"
            >
              <Trash2 className="h-3 w-3" />
              <span>Xóa hết</span>
            </button>
            <button
              type="button"
              onClick={onCloseInkMode}
              className="inline-flex min-h-[30px] items-center gap-1 rounded-full bg-[var(--accent-primary)] px-3 py-0.5 font-mono text-[10px] font-semibold text-[var(--accent-primary-fg)]"
            >
              <Check className="h-3 w-3" />
              <span>Xong</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
