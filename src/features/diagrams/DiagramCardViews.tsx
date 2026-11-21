"use client";

import React from "react";
import { ArrowDown, ArrowRight, Plus, X } from "lucide-react";
import { EditableChipList } from "@/features/diagrams/EditableChipList";
import { HIGHLIGHT_COLORS } from "@/lib/semantic-styles";
import type { DiagramData, GraphDiagram, HighlightColor } from "@/types/study";

export const DIAGRAM_COLOR_CSS: Record<HighlightColor, string> = {
  y: "var(--hl-yellow)",
  b: "var(--hl-blue)",
  p: "var(--hl-pink)",
  g: "var(--hl-green)",
};

export type CardDiagramUnion = Exclude<DiagramData, GraphDiagram>;

interface CardExtrasInfo {
  extraNodesCount: number;
  extraCrossLinksCount: number;
  directCustomChildrenByCardId: Record<string, number>;
}

export function FlowchartCardView({
  diagram,
  extras,
  commitCardChange,
  openParallelCanvas,
  headerBar,
}: {
  diagram: Extract<CardDiagramUnion, { kind: "flowchart" }>;
  extras: CardExtrasInfo;
  commitCardChange: (next: CardDiagramUnion) => void;
  openParallelCanvas: () => void;
  headerBar: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
      {headerBar}
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {diagram.steps.map((step, idx) => {
          const childCount =
            extras.directCustomChildrenByCardId[`card:flow:${step.id}`] ?? 0;
          return (
            <React.Fragment key={step.id}>
              <div className="relative min-w-0 flex-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-2.5 sm:min-w-[135px]">
                <div className="mb-1 flex items-center justify-between gap-1">
                  <span className="rounded-full bg-[var(--hl-blue)] px-1.5 py-0.5 font-mono text-[9px] font-bold">
                    B{idx + 1}
                  </span>
                  {diagram.steps.length > 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        commitCardChange({
                          ...diagram,
                          steps: diagram.steps.filter((s) => s.id !== step.id),
                        })
                      }
                      className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                      aria-label="Xóa bước"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <input
                  value={step.label}
                  onChange={(e) =>
                    commitCardChange({
                      ...diagram,
                      steps: diagram.steps.map((s) =>
                        s.id === step.id ? { ...s, label: e.target.value } : s
                      ),
                    })
                  }
                  className="w-full bg-transparent text-xs font-bold outline-none"
                />
                <input
                  value={step.note ?? ""}
                  onChange={(e) =>
                    commitCardChange({
                      ...diagram,
                      steps: diagram.steps.map((s) =>
                        s.id === step.id ? { ...s, note: e.target.value } : s
                      ),
                    })
                  }
                  placeholder="Ghi chú ngắn..."
                  className="mt-0.5 w-full bg-transparent text-[11px] text-[var(--ink-muted)] outline-none"
                />

                {childCount > 0 && (
                  <button
                    type="button"
                    onClick={openParallelCanvas}
                    className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-[var(--sem-def-border)] bg-[var(--hl-blue)]/80 px-2 py-0.5 font-mono text-[9px] font-bold text-[var(--ink-primary)] transition hover:brightness-95"
                  >
                    <span>↳ +{childCount} nhánh con (Canvas)</span>
                  </button>
                )}
              </div>

              {idx < diagram.steps.length - 1 && (
                <div className="flex items-center justify-center text-[var(--ink-muted)]">
                  <ArrowDown className="h-3.5 w-3.5 sm:hidden" />
                  <ArrowRight className="hidden h-3.5 w-3.5 sm:block" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() =>
          commitCardChange({
            ...diagram,
            steps: [
              ...diagram.steps,
              {
                id: `fs-${Date.now()}`,
                label: `Bước ${diagram.steps.length + 1}`,
                note: "Từ khóa nối tiếp",
              },
            ],
          })
        }
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--border-hairline)] px-2.5 py-1 font-mono text-[10px] text-[var(--ink-muted)] hover:border-[var(--ink-primary)] hover:text-[var(--ink-primary)]"
      >
        <Plus className="h-3 w-3" />
        <span>Thêm bước luồng</span>
      </button>
    </div>
  );
}

export function VennCardView({
  diagram,
  commitCardChange,
  headerBar,
}: {
  diagram: Extract<CardDiagramUnion, { kind: "venn" }>;
  commitCardChange: (next: CardDiagramUnion) => void;
  headerBar: React.ReactNode;
}) {
  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      {headerBar}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-0">
        <div
          className="rounded-2xl border border-[var(--sem-def-border)] p-3 sm:rounded-r-none sm:pr-4"
          style={{ backgroundColor: "var(--hl-blue)" }}
        >
          <input
            value={diagram.leftTitle}
            onChange={(e) =>
              commitCardChange({ ...diagram, leftTitle: e.target.value })
            }
            className="mb-2 w-full bg-transparent text-xs font-bold outline-none"
          />
          <EditableChipList
            items={diagram.leftOnly}
            placeholder="Điểm riêng A..."
            onChange={(leftOnly) => commitCardChange({ ...diagram, leftOnly })}
          />
        </div>

        <div
          className="z-10 rounded-2xl border border-[var(--sem-formula-border)] p-3 sm:-mx-2 sm:rounded-2xl"
          style={{ backgroundColor: "var(--hl-yellow)" }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase">
              ĐIỂM CHUNG (A ∩ B)
            </span>
          </div>
          <EditableChipList
            items={diagram.shared}
            placeholder="Điểm chung..."
            onChange={(shared) => commitCardChange({ ...diagram, shared })}
          />
        </div>

        <div
          className="rounded-2xl border border-[var(--sem-ex-border)] p-3 sm:rounded-l-none sm:pl-4"
          style={{ backgroundColor: "var(--hl-green)" }}
        >
          <input
            value={diagram.rightTitle}
            onChange={(e) =>
              commitCardChange({ ...diagram, rightTitle: e.target.value })
            }
            className="mb-2 w-full bg-transparent text-xs font-bold outline-none"
          />
          <EditableChipList
            items={diagram.rightOnly}
            placeholder="Điểm riêng B..."
            onChange={(rightOnly) => commitCardChange({ ...diagram, rightOnly })}
          />
        </div>
      </div>
    </div>
  );
}

export function TreeCardView({
  diagram,
  extras,
  commitCardChange,
  openParallelCanvas,
  headerBar,
}: {
  diagram: Extract<CardDiagramUnion, { kind: "tree" }>;
  extras: CardExtrasInfo;
  commitCardChange: (next: CardDiagramUnion) => void;
  openParallelCanvas: () => void;
  headerBar: React.ReactNode;
}) {
  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      {headerBar}
      <div className="flex flex-col items-center">
        <div className="w-full max-w-xs rounded-xl border border-[var(--ink-primary)] bg-[var(--bg-paper)] px-3 py-2 text-center shadow-2xs">
          <div className="font-mono text-[9px] text-[var(--ink-muted)] uppercase">
            GỐC CHỦ ĐỀ
          </div>
          <input
            value={diagram.root}
            onChange={(e) =>
              commitCardChange({ ...diagram, root: e.target.value })
            }
            className="w-full bg-transparent text-center text-xs font-bold outline-none sm:text-sm"
          />
        </div>
        <div className="h-4 w-[1.5px] bg-[var(--border-hairline)]" />
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {diagram.branches.map((br) => {
          const directBr =
            extras.directCustomChildrenByCardId[`card:tree:br:${br.id}`] ?? 0;
          const itemKids = br.items.reduce(
            (acc, _, iIdx) =>
              acc +
              (extras.directCustomChildrenByCardId[
                `card:tree:br:${br.id}:it:${iIdx}`
              ] ?? 0),
            0
          );
          const totalBrExtras = directBr + itemKids;

          return (
            <div
              key={br.id}
              className="rounded-xl border border-[var(--border-hairline)] p-3"
              style={{ backgroundColor: DIAGRAM_COLOR_CSS[br.color] }}
            >
              <div className="mb-2 flex items-center justify-between gap-1">
                <input
                  value={br.label}
                  onChange={(e) =>
                    commitCardChange({
                      ...diagram,
                      branches: diagram.branches.map((b) =>
                        b.id === br.id ? { ...b, label: e.target.value } : b
                      ),
                    })
                  }
                  className="min-w-0 flex-1 bg-transparent text-xs font-bold outline-none"
                />
                <div className="flex shrink-0 items-center gap-1">
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        commitCardChange({
                          ...diagram,
                          branches: diagram.branches.map((b) =>
                            b.id === br.id ? { ...b, color: c.id } : b
                          ),
                        })
                      }
                      className={`h-3 w-3 rounded-full border ${
                        br.color === c.id
                          ? "border-[var(--ink-primary)] scale-110"
                          : "border-black/20 opacity-60"
                      }`}
                      style={{ backgroundColor: c.cssVar }}
                      title={`Đổi màu ${c.label}`}
                    />
                  ))}
                  {diagram.branches.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        commitCardChange({
                          ...diagram,
                          branches: diagram.branches.filter(
                            (b) => b.id !== br.id
                          ),
                        })
                      }
                      className="ml-0.5 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              <EditableChipList
                items={br.items}
                placeholder="Từ khóa..."
                onChange={(items) =>
                  commitCardChange({
                    ...diagram,
                    branches: diagram.branches.map((b) =>
                      b.id === br.id ? { ...b, items } : b
                    ),
                  })
                }
              />

              {totalBrExtras > 0 && (
                <button
                  type="button"
                  onClick={openParallelCanvas}
                  className="mt-2 inline-flex items-center gap-1 rounded-full border border-[var(--sem-def-border)] bg-[var(--bg-elevated)]/90 px-2 py-0.5 font-mono text-[9px] font-bold text-[var(--ink-primary)]"
                >
                  <span>↳ +{totalBrExtras} nhánh con (Canvas)</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() =>
          commitCardChange({
            ...diagram,
            branches: [
              ...diagram.branches,
              {
                id: `tb-${Date.now()}`,
                label: `Nhánh ${diagram.branches.length + 1}`,
                items: ["Từ khóa mới"],
                color: (["b", "y", "g", "p"] as HighlightColor[])[
                  diagram.branches.length % 4
                ],
              },
            ],
          })
        }
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--border-hairline)] px-2.5 py-1 font-mono text-[10px] text-[var(--ink-muted)] hover:border-[var(--ink-primary)] hover:text-[var(--ink-primary)]"
      >
        <Plus className="h-3 w-3" />
        <span>Thêm nhánh cây</span>
      </button>
    </div>
  );
}

export function SpiderCardView({
  diagram,
  extras,
  commitCardChange,
  openParallelCanvas,
  headerBar,
}: {
  diagram: Extract<CardDiagramUnion, { kind: "spider" }>;
  extras: CardExtrasInfo;
  commitCardChange: (next: CardDiagramUnion) => void;
  openParallelCanvas: () => void;
  headerBar: React.ReactNode;
}) {
  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      {headerBar}
      <div className="flex justify-center">
        <div className="rounded-full border-2 border-[var(--ink-primary)] bg-[var(--bg-paper)] px-5 py-2 text-center shadow-xs">
          <span className="block font-mono text-[9px] text-[var(--ink-muted)] uppercase">
            TÂM MẠNG NHỆN
          </span>
          <input
            value={diagram.center}
            onChange={(e) =>
              commitCardChange({ ...diagram, center: e.target.value })
            }
            className="bg-transparent text-center text-xs font-bold outline-none sm:text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {diagram.nodes.map((node) => {
          const childCount =
            extras.directCustomChildrenByCardId[
              `card:spider:node:${node.id}`
            ] ?? 0;
          return (
            <div
              key={node.id}
              className="rounded-xl border border-[var(--border-hairline)] p-3"
              style={{ backgroundColor: DIAGRAM_COLOR_CSS[node.color] }}
            >
              <div className="flex items-center justify-between gap-1">
                <input
                  value={node.label}
                  onChange={(e) =>
                    commitCardChange({
                      ...diagram,
                      nodes: diagram.nodes.map((n) =>
                        n.id === node.id ? { ...n, label: e.target.value } : n
                      ),
                    })
                  }
                  className="min-w-0 flex-1 bg-transparent text-xs font-bold outline-none"
                />
                <div className="flex shrink-0 items-center gap-1">
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        commitCardChange({
                          ...diagram,
                          nodes: diagram.nodes.map((n) =>
                            n.id === node.id ? { ...n, color: c.id } : n
                          ),
                        })
                      }
                      className={`h-3 w-3 rounded-full border ${
                        node.color === c.id
                          ? "border-[var(--ink-primary)] scale-110"
                          : "border-black/20 opacity-60"
                      }`}
                      style={{ backgroundColor: c.cssVar }}
                    />
                  ))}
                  {diagram.nodes.length > 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        commitCardChange({
                          ...diagram,
                          nodes: diagram.nodes.filter((n) => n.id !== node.id),
                        })
                      }
                      className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              <input
                value={node.detail ?? ""}
                onChange={(e) =>
                  commitCardChange({
                    ...diagram,
                    nodes: diagram.nodes.map((n) =>
                      n.id === node.id ? { ...n, detail: e.target.value } : n
                    ),
                  })
                }
                placeholder="Từ khóa chi tiết..."
                className="mt-1 w-full rounded-lg bg-[var(--bg-elevated)]/75 px-2 py-1 text-xs outline-none"
              />
              {childCount > 0 && (
                <button
                  type="button"
                  onClick={openParallelCanvas}
                  className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-[var(--sem-def-border)] bg-[var(--bg-elevated)]/90 px-2 py-0.5 font-mono text-[9px] font-bold text-[var(--ink-primary)]"
                >
                  <span>↳ +{childCount} nhánh con (Canvas)</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() =>
          commitCardChange({
            ...diagram,
            nodes: [
              ...diagram.nodes,
              {
                id: `sn-${Date.now()}`,
                label: `Nhánh ${diagram.nodes.length + 1}`,
                detail: "Từ khóa ngắn gọn",
                color: (["b", "y", "g", "p"] as HighlightColor[])[
                  diagram.nodes.length % 4
                ],
              },
            ],
          })
        }
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--border-hairline)] px-2.5 py-1 font-mono text-[10px] text-[var(--ink-muted)] hover:border-[var(--ink-primary)] hover:text-[var(--ink-primary)]"
      >
        <Plus className="h-3 w-3" />
        <span>Thêm nhánh mạng nhện</span>
      </button>
    </div>
  );
}
