"use client";

import React, { useState } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Check, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { HighlightText } from "@/components/ui/HighlightText";
import { HIGHLIGHT_COLORS } from "@/lib/semantic-styles";
import type { HighlightColor } from "@/types/study";

export interface StudyNodeData extends Record<string, unknown> {
  variant: "editable" | "visualize";
  label: string;
  detail?: string;
  badge?: string;
  color?: HighlightColor;
  bgVar?: string;
  borderVar?: string;
  isRoot?: boolean;
  isWikiLink?: boolean;
  tags?: string[];
  onAddChild?: (nodeId: string) => void;
  onChangeContent?: (
    nodeId: string,
    patch: { label?: string; detail?: string; color?: HighlightColor }
  ) => void;
  onDelete?: (nodeId: string) => void;
}

export type StudyFlowNode = Node<StudyNodeData, "studyNode">;

const COLOR_STYLE_MAP: Record<
  HighlightColor,
  { bg: string; border: string }
> = {
  y: { bg: "var(--hl-yellow)", border: "var(--sem-formula-border)" },
  b: { bg: "var(--hl-blue)", border: "var(--sem-def-border)" },
  g: { bg: "var(--hl-green)", border: "var(--sem-ex-border)" },
  p: { bg: "var(--hl-pink)", border: "var(--sem-trap-border)" },
};

function StudyGraphNodeInner({
  id,
  data,
  selected,
}: NodeProps<StudyFlowNode>) {
  const [editing, setEditing] = useState(false);

  const colorKey: HighlightColor = data.color ?? "y";
  const resolvedPalette = {
    bg: data.bgVar ?? COLOR_STYLE_MAP[colorKey].bg,
    border:
      data.isRoot
        ? "var(--ink-primary)"
        : data.borderVar ?? COLOR_STYLE_MAP[colorKey].border,
  };

  const handles = (
    <>
      <Handle id="top" type="source" position={Position.Top} />
      <Handle id="right" type="source" position={Position.Right} />
      <Handle id="bottom" type="source" position={Position.Bottom} />
      <Handle id="left" type="source" position={Position.Left} />
    </>
  );

  if (data.variant === "visualize") {
    return (
      <div
        className={`relative rounded-xl border px-3 py-2.5 text-left transition ${
          data.isRoot ? "w-[255px] border-2" : "w-[235px]"
        } ${data.isWikiLink ? "border-dashed" : ""} ${
          selected ? "ring-2 ring-[var(--ink-primary)]/45 shadow-md" : "shadow-xs"
        }`}
        style={{
          backgroundColor: resolvedPalette.bg,
          borderColor: resolvedPalette.border,
        }}
      >
        {handles}

        <div className="mb-1 flex items-center justify-between gap-1.5">
          <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold tracking-wider text-[var(--ink-muted)] uppercase">
            {data.isWikiLink && <Link2 className="h-2.5 w-2.5" />}
            <span>{data.badge ?? (data.isRoot ? "GỐC TRANG" : "Ý KIẾN THỨC")}</span>
          </span>
        </div>

        <div className="text-xs leading-snug font-bold text-[var(--ink-primary)]">
          <HighlightText text={data.label} disableWikiNavigation />
        </div>

        {data.detail && (
          <div className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-[var(--ink-muted)]">
            <HighlightText text={data.detail} disableWikiNavigation />
          </div>
        )}

        {data.tags && data.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {data.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/85 px-1.5 py-0.5 font-mono text-[9px] text-[var(--ink-muted)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Interactive Editable Canvas Node
  return (
    <div
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      className={`relative w-[228px] rounded-xl border px-3 py-2.5 text-left transition ${
        data.isRoot ? "border-2" : ""
      } ${selected ? "ring-2 ring-[var(--ink-primary)]/45 shadow-md" : "shadow-xs"}`}
      style={{
        backgroundColor: data.isRoot ? "var(--bg-elevated)" : resolvedPalette.bg,
        borderColor: resolvedPalette.border,
      }}
    >
      {handles}

      <div className="mb-1 flex items-center justify-between gap-1">
        <span className="font-mono text-[9px] font-bold tracking-wider text-[var(--ink-muted)] uppercase">
          {data.isRoot ? "GỐC CHỦ ĐỀ" : "NHÁNH Ý"}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setEditing((v) => !v);
          }}
          className="nodrag nopan rounded p-0.5 text-[var(--ink-muted)] hover:bg-black/10 hover:text-[var(--ink-primary)]"
          title={editing ? "Xong" : "Sửa nội dung"}
        >
          {editing ? (
            <Check className="h-3 w-3" />
          ) : (
            <Pencil className="h-3 w-3" />
          )}
        </button>
      </div>

      {editing ? (
        <div className="nodrag nopan space-y-1.5">
          <input
            autoFocus
            value={data.label}
            onChange={(e) =>
              data.onChangeContent?.(id, { label: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") setEditing(false);
            }}
            placeholder="Tên nhánh (hỗ trợ $x^2$)..."
            className="w-full rounded-md border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2 py-1 text-xs font-bold text-[var(--ink-primary)] outline-none"
          />
          <input
            value={data.detail ?? ""}
            onChange={(e) =>
              data.onChangeContent?.(id, { detail: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") setEditing(false);
            }}
            placeholder="Từ khóa / ghi chú..."
            className="w-full rounded-md border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2 py-1 text-[11px] text-[var(--ink-primary)] outline-none"
          />
        </div>
      ) : (
        <div className="space-y-0.5">
          <div className="text-xs leading-snug font-bold text-[var(--ink-primary)]">
            <HighlightText text={data.label} disableWikiNavigation />
          </div>
          {data.detail && (
            <div className="text-[11px] leading-snug text-[var(--ink-muted)]">
              <HighlightText text={data.detail} disableWikiNavigation />
            </div>
          )}
        </div>
      )}

      {/* Action footer: + Nhánh con on EVERY node, color dots, delete */}
      <div className="nodrag nopan mt-2 flex items-center justify-between gap-1 border-t border-black/10 pt-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            data.onAddChild?.(id);
          }}
          className="inline-flex items-center gap-0.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/90 px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--ink-primary)] transition hover:border-[var(--ink-primary)]"
          title="Chẻ nhánh con mới từ thẻ này"
        >
          <Plus className="h-2.5 w-2.5" />
          <span>Nhánh con</span>
        </button>

        <div className="flex items-center gap-1">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                data.onChangeContent?.(id, { color: c.id });
              }}
              className={`h-2.5 w-2.5 rounded-full border transition ${
                colorKey === c.id
                  ? "scale-120 border-[var(--ink-primary)]"
                  : "border-black/20 opacity-70 hover:opacity-100"
              }`}
              style={{ backgroundColor: c.cssVar }}
              title={`Đổi màu ${c.label}`}
            />
          ))}
          {!data.isRoot && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                data.onDelete?.(id);
              }}
              className="ml-0.5 rounded p-0.5 text-[var(--ink-muted)] hover:bg-black/10 hover:text-[var(--ink-primary)]"
              title="Xóa nhánh này"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const StudyGraphNode = React.memo(StudyGraphNodeInner);
