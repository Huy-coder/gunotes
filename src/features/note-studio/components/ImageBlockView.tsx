"use client";

import React, { useRef, useState } from "react";
import { Expand, PenTool, Trash2, Undo2, X } from "lucide-react";
import type { InkStroke } from "@/types/study";

const ANNOTATE_COLORS = [
  { id: "#D93829", label: "Đỏ" },
  { id: "#D99B00", label: "Vàng" },
  { id: "#2563EB", label: "Xanh" },
];

function strokeToPath(points: Array<[number, number]>): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const [x, y] = points[0];
    return `M ${x} ${y} L ${x + 0.5} ${y + 0.5}`;
  }
  return points
    .map(([x, y], idx) => `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
}

export function ImageBlockView({
  imageUrl,
  caption,
  strokes = [],
  onPatch,
}: {
  imageUrl?: string;
  caption?: string;
  strokes?: InkStroke[];
  onPatch: (patch: {
    imageCaption?: string;
    imageStrokes?: InkStroke[];
  }) => void;
}) {
  const [annotating, setAnnotating] = useState(false);
  const [strokeColor, setStrokeColor] = useState("#D93829");
  const [zoomOpen, setZoomOpen] = useState(false);
  const [draftStroke, setDraftStroke] = useState<InkStroke | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  if (!imageUrl) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border-hairline)] p-6 text-center font-mono text-xs text-[var(--ink-muted)]">
        Chưa có hình ảnh nào trong khối này.
      </div>
    );
  }

  const getNormalizedPoint = (e: React.PointerEvent<SVGSVGElement>): [number, number] => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1000, ((e.clientX - rect.left) / Math.max(1, rect.width)) * 1000));
    const y = Math.max(0, Math.min(1000, ((e.clientY - rect.top) / Math.max(1, rect.height)) * 1000));
    return [x, y];
  };

  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)]"
      >
        <img
          src={imageUrl}
          alt={caption || "Ảnh ghi chú"}
          className="max-h-[420px] w-full object-contain select-none"
        />

        {/* SVG Ink Annotation Overlay */}
        <svg
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          onPointerDown={(e) => {
            if (!annotating) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            const pt = getNormalizedPoint(e);
            setDraftStroke({
              id: `ist-${Date.now()}`,
              color: strokeColor,
              width: 5,
              points: [pt],
            });
          }}
          onPointerMove={(e) => {
            if (!annotating || !draftStroke) return;
            const pt = getNormalizedPoint(e);
            setDraftStroke((cur) =>
              cur ? { ...cur, points: [...cur.points, pt] } : cur
            );
          }}
          onPointerUp={() => {
            if (!annotating || !draftStroke) return;
            onPatch({ imageStrokes: [...strokes, draftStroke] });
            setDraftStroke(null);
          }}
          className={`absolute inset-0 h-full w-full ${
            annotating
              ? "cursor-crosshair touch-none"
              : "pointer-events-none"
          }`}
        >
          {strokes.map((st) => (
            <path
              key={st.id}
              d={strokeToPath(st.points)}
              fill="none"
              stroke={st.color}
              strokeWidth={st.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {draftStroke && (
            <path
              d={strokeToPath(draftStroke.points)}
              fill="none"
              stroke={draftStroke.color}
              strokeWidth={draftStroke.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>

        {/* Top-right floating action controls */}
        <div className="no-print absolute top-2 right-2 flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/90 px-2 py-1 backdrop-blur-xs">
          <button
            type="button"
            onClick={() => setAnnotating((v) => !v)}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
              annotating
                ? "bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                : "text-[var(--ink-primary)] hover:bg-[var(--bg-desk)]"
            }`}
            title="Khoanh tròn hoặc vẽ chú thích lên ảnh"
          >
            <PenTool className="h-3 w-3" />
            <span>{annotating ? "Đang khoanh" : "Khoanh chú thích"}</span>
          </button>
          <button
            type="button"
            onClick={() => setZoomOpen(true)}
            className="rounded-full p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)]"
            title="Phóng to ảnh"
          >
            <Expand className="h-3 w-3" />
          </button>
        </div>
      </div>

      {annotating && (
        <div className="no-print flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-1.5 font-mono text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--ink-muted)]">Màu mực:</span>
            {ANNOTATE_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setStrokeColor(c.id)}
                className={`h-5 w-5 rounded-full border ${
                  strokeColor === c.id
                    ? "border-[var(--ink-primary)] ring-2 ring-[var(--ink-primary)]/25"
                    : "border-black/15"
                }`}
                style={{ backgroundColor: c.id }}
                aria-label={c.label}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={strokes.length === 0}
              onClick={() =>
                onPatch({ imageStrokes: strokes.slice(0, -1) })
              }
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-hairline)] px-2 py-0.5 disabled:opacity-40"
            >
              <Undo2 className="h-3 w-3" />
              <span>Hoàn tác</span>
            </button>
            <button
              type="button"
              disabled={strokes.length === 0}
              onClick={() => onPatch({ imageStrokes: [] })}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-hairline)] px-2 py-0.5 disabled:opacity-40"
            >
              <Trash2 className="h-3 w-3" />
              <span>Xóa nét</span>
            </button>
            <button
              type="button"
              onClick={() => setAnnotating(false)}
              className="rounded-full bg-[var(--accent-primary)] px-2.5 py-0.5 font-semibold text-[var(--accent-primary-fg)]"
            >
              Xong
            </button>
          </div>
        </div>
      )}

      <input
        value={caption ?? ""}
        onChange={(e) => onPatch({ imageCaption: e.target.value })}
        placeholder="Thêm chú thích cho hình ảnh này..."
        className="w-full bg-transparent px-1 text-xs text-[var(--ink-muted)] outline-none placeholder:text-[var(--ink-muted)]/60 focus:text-[var(--ink-primary)]"
      />

      {zoomOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setZoomOpen(false)}
        >
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            className="absolute top-4 right-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
            aria-label="Đóng ảnh"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={imageUrl}
            alt={caption || "Ảnh phóng to"}
            className="max-h-[90vh] max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
