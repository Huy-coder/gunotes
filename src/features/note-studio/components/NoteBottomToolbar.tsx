"use client";

import React from "react";
import {
  GitBranch,
  Highlighter,
  Layers,
  PenLine,
  Sigma,
  Sparkles,
  Undo2,
} from "lucide-react";
import { SEMANTIC_META } from "@/lib/semantic-styles";
import type { BlockType, DiagramData } from "@/types/study";

export function NoteBottomToolbar({
  isEditingAny,
  slashOpen,
  setSlashOpen,
  diagramPickerOpen,
  setDiagramPickerOpen,
  brushMode,
  onToggleBrushMode,
  highlightHistoryCount,
  onUndoHighlight,
  onQuickWrite,
  onInsertBlock,
  onInsertDiagram,
  onOpenNewFormula,
  onOpenCustomize,
}: {
  isEditingAny: boolean;
  slashOpen: boolean;
  setSlashOpen: React.Dispatch<React.SetStateAction<boolean>>;
  diagramPickerOpen: boolean;
  setDiagramPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  brushMode: boolean;
  onToggleBrushMode: () => void;
  highlightHistoryCount: number;
  onUndoHighlight: () => void;
  onQuickWrite: () => void;
  onInsertBlock: (type: BlockType) => void;
  onInsertDiagram: (kind: DiagramData["kind"]) => void;
  onOpenNewFormula: () => void;
  onOpenCustomize: () => void;
}) {
  return (
    <>
      {slashOpen && (
        <div className="no-print fixed bottom-20 left-1/2 z-40 w-[92vw] max-w-sm -translate-x-1/2 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-2 shadow-xl">
          <div className="px-3 py-1.5 font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
            Chèn khối kiến thức mới (/)
          </div>
          {(["text", "def", "formula", "example", "trap"] as BlockType[]).map(
            (t) => {
              const meta = SEMANTIC_META[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onInsertBlock(t)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition hover:bg-[var(--bg-desk)]"
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className="h-3.5 w-3.5 rounded-full border"
                      style={{
                        backgroundColor: meta.bgVar,
                        borderColor: meta.borderVar,
                      }}
                    />
                    <span>
                      <strong className="font-semibold">{meta.badge}</strong>
                      <span className="ml-2 text-[var(--ink-muted)]">
                        {meta.description}
                      </span>
                    </span>
                  </span>
                  <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                    {meta.shortcut}
                  </span>
                </button>
              );
            }
          )}
        </div>
      )}

      {diagramPickerOpen && (
        <div className="no-print fixed bottom-20 left-1/2 z-40 w-[92vw] max-w-sm -translate-x-1/2 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-2 shadow-xl">
          <div className="px-3 py-1.5 font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
            Chèn 1 chạm: Thước khuôn Sơ đồ
          </div>
          {(
            [
              {
                kind: "graph",
                title: "Sơ đồ Nhánh Đa Tầng (Canvas Zoom)",
                sub: "Nâng cao: Zoom/Pan, chẻ nhánh vô hạn tầng & nối chéo",
              },
              {
                kind: "flowchart",
                title: "Sơ đồ Luồng (Flowchart)",
                sub: "Hợp quy trình, bước giải Toán/Lý/Sử",
              },
              {
                kind: "venn",
                title: "Biểu đồ Venn (So sánh)",
                sub: "2 vòng tròn giao nhau: Giống & Khác",
              },
              {
                kind: "tree",
                title: "Sơ đồ Cây (Tree Diagram)",
                sub: "Phân loại nhánh hoặc tóm tắt cả chương",
              },
              {
                kind: "spider",
                title: "Sơ đồ Mạng Nhện (Spider)",
                sub: "Tâm chủ đề tỏa các thẻ từ khóa",
              },
            ] as const
          ).map((item) => (
            <button
              key={item.kind}
              type="button"
              onClick={() => onInsertDiagram(item.kind)}
              className="block w-full rounded-xl px-3 py-2 text-left text-xs transition hover:bg-[var(--bg-desk)]"
            >
              <div className="font-semibold">{item.title}</div>
              <div className="text-[11px] text-[var(--ink-muted)]">
                {item.sub}
              </div>
            </button>
          ))}
        </div>
      )}

      <div
        className={`no-print pointer-events-none fixed right-0 bottom-4 left-0 z-30 justify-center px-3 lg:left-[232px] ${
          isEditingAny ? "hidden sm:flex" : "flex"
        }`}
      >
        <div className="paper-shadow pointer-events-auto flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/95 px-2.5 py-1.5 backdrop-blur-md sm:gap-2 sm:px-3.5">
          <button
            type="button"
            onClick={onQuickWrite}
            title="Thêm dòng viết tiếp ngay lập tức"
            className="flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-primary-fg)] transition hover:opacity-90"
          >
            <PenLine className="h-3.5 w-3.5" />
            <span>Viết</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSlashOpen((v) => !v);
              setDiagramPickerOpen(false);
            }}
            title="Chèn khối ngữ nghĩa (/)"
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition ${
              slashOpen
                ? "border-[var(--ink-primary)] bg-[var(--bg-desk)] text-[var(--ink-primary)]"
                : "border-[var(--border-hairline)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Khối</span>
          </button>

          <div className="mx-0.5 hidden h-4 w-[1px] bg-[var(--border-hairline)] sm:block" />

          <div className="hidden items-center gap-1.5 sm:flex">
            {(["def", "formula", "example", "trap"] as BlockType[]).map((t) => {
              const meta = SEMANTIC_META[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onInsertBlock(t)}
                  title={`Thêm khối ${meta.badge}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full border transition hover:scale-110"
                  style={{
                    backgroundColor: meta.bgVar,
                    borderColor: meta.borderVar,
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: meta.borderVar }}
                  />
                </button>
              );
            })}
          </div>

          <div className="mx-0.5 h-4 w-[1px] bg-[var(--border-hairline)]" />

          <button
            type="button"
            data-highlight-ui="true"
            onClick={onToggleBrushMode}
            title="Chế độ Bút nhớ (tô màu trực tiếp)"
            className={`flex items-center gap-1 rounded-full border px-2 py-1.5 text-xs font-medium transition sm:px-2.5 ${
              brushMode
                ? "border-[var(--ink-primary)] bg-[var(--hl-yellow)] text-[var(--ink-primary)]"
                : "border-transparent text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)]"
            }`}
          >
            <Highlighter className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Bút nhớ</span>
          </button>

          {highlightHistoryCount > 0 && (
            <button
              type="button"
              data-highlight-ui="true"
              onClick={onUndoHighlight}
              title="Hoàn tác tô màu (Ctrl/Cmd+Z)"
              className="flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2 py-1.5 text-xs font-medium text-[var(--ink-primary)] transition hover:border-[var(--ink-primary)]"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span className="font-mono text-[10px]">
                {highlightHistoryCount}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setDiagramPickerOpen((v) => !v);
              setSlashOpen(false);
            }}
            title="Chèn Sơ đồ trực quan (Luồng, Venn, Cây, Mạng nhện)"
            className={`flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-medium transition sm:px-2.5 ${
              diagramPickerOpen
                ? "bg-[var(--bg-desk)] text-[var(--ink-primary)]"
                : "text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)]"
            }`}
          >
            <GitBranch className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sơ đồ</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewFormula}
            title="Soạn công thức Toán / Lý / Hóa (fx)"
            className="flex items-center gap-1 rounded-full px-2 py-1.5 font-mono text-xs font-semibold text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)] sm:px-2.5"
          >
            <Sigma className="h-3.5 w-3.5" />
            <span>fx</span>
          </button>

          <button
            type="button"
            onClick={onOpenCustomize}
            className="hidden items-center gap-1 rounded-full px-2 py-1.5 text-xs font-medium text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)] sm:flex"
            title="Đổi sticker & giấy"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}
