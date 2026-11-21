"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowRight, Network, Plus, RotateCcw, X } from "lucide-react";
import { StudyGraphCanvas } from "@/components/graph/StudyGraphCanvas";
import { HighlightText } from "@/components/ui/HighlightText";
import {
  createMultiLevelGraphPreset,
  diagramToGraph,
  getCanvasExtrasSummary,
  syncCardToGraph,
  syncGraphToCard,
} from "@/lib/graph-layout";
import { HIGHLIGHT_COLORS } from "@/lib/semantic-styles";
import type {
  CornellBlock,
  DiagramData,
  DiagramViewMode,
  GraphDiagram,
  GraphNodeItem,
  HighlightColor,
} from "@/types/study";

const COLOR_CSS: Record<HighlightColor, string> = {
  y: "var(--hl-yellow)",
  b: "var(--hl-blue)",
  p: "var(--hl-pink)",
  g: "var(--hl-green)",
};

export function createDiagramPreset(kind: DiagramData["kind"]): DiagramData {
  switch (kind) {
    case "flowchart":
      return {
        kind: "flowchart",
        steps: [
          { id: `fs-${Date.now()}-1`, label: "Bước 1: Đọc dữ kiện", note: "Xác định từ khóa" },
          { id: `fs-${Date.now()}-2`, label: "Bước 2: Chọn công thức", note: "Kiểm tra điều kiện" },
          { id: `fs-${Date.now()}-3`, label: "Bước 3: Kết luận", note: "Đối chiếu bẫy" },
        ],
      };
    case "venn":
      return {
        kind: "venn",
        leftTitle: "Khái niệm A",
        rightTitle: "Khái niệm B",
        leftOnly: ["Đặc điểm riêng A"],
        shared: ["Điểm giống nhau cốt lõi"],
        rightOnly: ["Đặc điểm riêng B"],
      };
    case "tree":
      return {
        kind: "tree",
        root: "Chủ đề chương",
        branches: [
          {
            id: `tb-${Date.now()}-1`,
            label: "Nhánh 1: Bối cảnh",
            items: ["Từ khóa 1", "Từ khóa 2"],
            color: "b",
          },
          {
            id: `tb-${Date.now()}-2`,
            label: "Nhánh 2: Nội dung chính",
            items: ["Từ khóa 3", "Từ khóa 4"],
            color: "y",
          },
          {
            id: `tb-${Date.now()}-3`,
            label: "Nhánh 3: Kết quả / Ý nghĩa",
            items: ["Từ khóa 5"],
            color: "g",
          },
        ],
      };
    case "graph":
      return createMultiLevelGraphPreset("mindmap");
    case "spider":
      return {
        kind: "spider",
        center: "Đối tượng trung tâm",
        nodes: [
          { id: `sn-${Date.now()}-1`, label: "Cấu tạo", detail: "Ghi ngắn 3-5 từ", color: "b" },
          { id: `sn-${Date.now()}-2`, label: "Cơ chế", detail: "Nguyên lý hoạt động", color: "y" },
          { id: `sn-${Date.now()}-3`, label: "Vai trò", detail: "Ứng dụng thực tế", color: "g" },
          { id: `sn-${Date.now()}-4`, label: "Lưu ý thi", detail: "Điểm dễ nhầm", color: "p" },
        ],
      };
  }
}

function EditableChipList({
  items,
  placeholder,
  onChange,
}: {
  items: string[];
  placeholder: string;
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-1.5">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="flex items-center gap-1 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/85 px-2 py-1"
        >
          <input
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[idx] = e.target.value;
              onChange(next);
            }}
            className="min-w-0 flex-1 bg-transparent text-xs outline-none"
          />
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
              className="shrink-0 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              aria-label="Xóa ý"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, placeholder])}
        className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
      >
        <Plus className="h-3 w-3" />
        <span>Thêm ý</span>
      </button>
    </div>
  );
}

function buildCollapsedOutline(diagram: GraphDiagram): {
  rootNode: GraphNodeItem | undefined;
  outline: Array<{ node: GraphNodeItem; depth: number }>;
  crossLinks: Array<{
    id: string;
    fromLabel: string;
    toLabel: string;
    label?: string;
  }>;
} {
  const nodeMap = new Map(diagram.nodes.map((n) => [n.id, n]));
  const rootNode = diagram.nodes.find((n) => n.isRoot) ?? diagram.nodes[0];
  const childrenOf = new Map<string, string[]>();
  for (const n of diagram.nodes) childrenOf.set(n.id, []);

  for (const edge of diagram.edges) {
    if (edge.dashed) continue;
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) continue;
    const list = childrenOf.get(edge.source) ?? [];
    if (!list.includes(edge.target)) list.push(edge.target);
    childrenOf.set(edge.source, list);
  }
  for (const n of diagram.nodes) {
    if (n.parentId && nodeMap.has(n.parentId)) {
      const list = childrenOf.get(n.parentId) ?? [];
      if (!list.includes(n.id)) list.push(n.id);
      childrenOf.set(n.parentId, list);
    }
  }

  const visited = new Set<string>();
  const outline: Array<{ node: GraphNodeItem; depth: number }> = [];

  const dfs = (id: string, depth: number) => {
    for (const childId of childrenOf.get(id) ?? []) {
      if (visited.has(childId)) continue;
      visited.add(childId);
      const node = nodeMap.get(childId);
      if (node) {
        outline.push({ node, depth });
        dfs(childId, depth + 1);
      }
    }
  };

  if (rootNode) {
    visited.add(rootNode.id);
    dfs(rootNode.id, 1);
  }
  for (const n of diagram.nodes) {
    if (!visited.has(n.id)) {
      visited.add(n.id);
      outline.push({ node: n, depth: 1 });
      dfs(n.id, 2);
    }
  }

  const crossLinks = diagram.edges
    .filter((e) => e.dashed)
    .map((e) => ({
      id: e.id,
      fromLabel: nodeMap.get(e.source)?.label ?? "?",
      toLabel: nodeMap.get(e.target)?.label ?? "?",
      label: e.label,
    }));

  return { rootNode, outline, crossLinks };
}

function GraphCanvasWithFullscreen({
  graph,
  fullscreen,
  setFullscreen,
  onGraphChange,
  onCloseCanvas,
}: {
  graph: GraphDiagram;
  fullscreen: boolean;
  setFullscreen: (open: boolean) => void;
  onGraphChange: (next: GraphDiagram) => void;
  onCloseCanvas: () => void;
}) {
  return (
    <>
      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
        {fullscreen ? (
          <div className="flex h-[370px] items-center justify-center rounded-2xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-paper)] font-mono text-xs text-[var(--ink-muted)] sm:h-[430px]">
            Đang mở Canvas toàn màn hình...
          </div>
        ) : (
          <StudyGraphCanvas
            diagram={graph}
            onChange={onGraphChange}
            heightClass="h-[370px] sm:h-[430px]"
            onToggleFullscreen={() => setFullscreen(true)}
            isFullscreen={false}
            onClose={onCloseCanvas}
            closeLabel="Đóng Canvas"
          />
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-[var(--ink-muted)]">
          <span>
            Mẹo: Cuộn để zoom • Kéo để di chuyển • Nhấp đúp thẻ để sửa • Kéo chấm tròn giữa 2 nhánh để nối chéo
          </span>
        </div>
      </div>

      {fullscreen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Canvas Sơ đồ Đa tầng toàn màn hình"
            className="no-print fixed inset-0 z-[100] flex h-dvh w-screen flex-col bg-[var(--bg-desk)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2 sm:px-5">
              <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase">
                <Network className="h-4 w-4" />
                <span>Canvas Sơ đồ Đa tầng (Toàn màn hình)</span>
              </span>
              <button
                type="button"
                onClick={() => setFullscreen(false)}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-1 text-xs font-semibold hover:border-[var(--ink-primary)]"
              >
                <X className="h-3.5 w-3.5" />
                <span>Đóng toàn màn hình (Esc)</span>
              </button>
            </div>
            <div className="min-h-0 w-full flex-1">
              <StudyGraphCanvas
                diagram={graph}
                onChange={onGraphChange}
                heightClass="h-full"
                onToggleFullscreen={() => setFullscreen(false)}
                isFullscreen={true}
                onClose={onCloseCanvas}
                closeLabel="Đóng Canvas"
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export function DiagramBlockView({
  diagram,
  canvasGraph,
  viewMode,
  onPatch,
}: {
  diagram: DiagramData;
  canvasGraph?: GraphDiagram;
  viewMode?: DiagramViewMode;
  onPatch: (
    patch: Partial<Pick<CornellBlock, "diagram" | "canvasGraph" | "diagramViewMode">>
  ) => void;
}) {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  // Branch A: Native `kind: "graph"` blocks (or pre-refactor upgraded blocks with `sourceDiagram`)
  if (diagram.kind === "graph") {
    const handleCloseGraph = () => {
      setFullscreen(false);
      // Migrate pre-refactor blocks into parallel dual-storage cleanly without losing edits
      if (diagram.sourceDiagram) {
        const { sourceDiagram, ...cleanGraph } = diagram;
        onPatch({
          diagram: sourceDiagram,
          canvasGraph: { ...cleanGraph, collapsed: false },
          diagramViewMode: "card",
        });
      } else {
        onPatch({ diagram: { ...diagram, collapsed: true } });
      }
    };

    if (diagram.collapsed && !diagram.sourceDiagram) {
      const { rootNode, outline, crossLinks } = buildCollapsedOutline(diagram);

      return (
        <div
          className="space-y-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-3.5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[10px] font-bold tracking-wider text-[var(--ink-muted)] uppercase">
                SƠ ĐỒ ĐA TẦNG ({diagram.nodes.length} Ý • {diagram.edges.length}{" "}
                LIÊN KẾT)
              </div>
              <div className="mt-0.5 text-xs font-bold sm:text-sm">
                <HighlightText
                  text={rootNode?.label ?? "Sơ đồ nhánh"}
                  disableWikiNavigation
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                onPatch({ diagram: { ...diagram, collapsed: false } })
              }
              className="no-print inline-flex items-center gap-1.5 rounded-full border border-[var(--ink-primary)] bg-[var(--hl-yellow)] px-3 py-1 font-mono text-[10px] font-bold text-[var(--ink-primary)] transition hover:brightness-95"
            >
              <Network className="h-3.5 w-3.5" />
              <span>Mở Canvas Zoom / Chẻ nhánh</span>
            </button>
          </div>

          {outline.length > 0 && (
            <div className="space-y-1 border-t border-dashed border-[var(--border-hairline)] pt-2">
              {outline.map(({ node, depth }) => (
                <div
                  key={node.id}
                  style={{
                    paddingLeft: `${Math.min(depth - 1, 4) * 16}px`,
                  }}
                  className="flex items-start gap-1.5 text-xs leading-snug"
                >
                  {depth > 1 && (
                    <span className="mt-0.5 shrink-0 font-mono text-[11px] text-[var(--ink-muted)]">
                      ↳
                    </span>
                  )}
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full border border-black/15"
                    style={{ backgroundColor: COLOR_CSS[node.color] }}
                  />
                  <div className="min-w-0 flex-1 font-medium text-[var(--ink-primary)]">
                    <HighlightText text={node.label} disableWikiNavigation />
                  </div>
                </div>
              ))}
            </div>
          )}

          {crossLinks.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-dashed border-[var(--border-hairline)] pt-2 font-mono text-[10px] text-[var(--ink-muted)]">
              {crossLinks.map((cl) => (
                <span
                  key={cl.id}
                  className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-dashed border-[var(--sem-trap-border)] bg-[var(--bg-elevated)]/80 px-2 py-0.5 text-[var(--ink-primary)]"
                >
                  <HighlightText text={cl.fromLabel} disableWikiNavigation />
                  <span>⇄</span>
                  <HighlightText text={cl.toLabel} disableWikiNavigation />
                  {cl.label ? `(${cl.label})` : ""}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <GraphCanvasWithFullscreen
        graph={diagram}
        fullscreen={fullscreen}
        setFullscreen={setFullscreen}
        onGraphChange={(next) => onPatch({ diagram: next })}
        onCloseCanvas={handleCloseGraph}
      />
    );
  }

  // Branch B: Structured Card Diagrams (`flowchart`, `venn`, `tree`, `spider`)
  // with Parallel Synced `canvasGraph`
  const openParallelCanvas = () => {
    const syncedGraph = syncCardToGraph(diagram, canvasGraph);
    onPatch({
      canvasGraph: syncedGraph,
      diagramViewMode: "canvas",
    });
  };

  if (viewMode === "canvas") {
    const activeCanvasGraph = syncCardToGraph(diagram, canvasGraph);
    return (
      <GraphCanvasWithFullscreen
        graph={activeCanvasGraph}
        fullscreen={fullscreen}
        setFullscreen={setFullscreen}
        onGraphChange={(nextGraph) => {
          const syncedCard = syncGraphToCard(nextGraph, diagram);
          onPatch({
            diagram: syncedCard,
            canvasGraph: nextGraph,
            diagramViewMode: "canvas",
          });
        }}
        onCloseCanvas={() => {
          setFullscreen(false);
          onPatch({ diagramViewMode: "card" });
        }}
      />
    );
  }

  const commitCardChange = (nextCard: Exclude<DiagramData, GraphDiagram>) => {
    onPatch({
      diagram: nextCard,
      canvasGraph: canvasGraph
        ? syncCardToGraph(nextCard, canvasGraph)
        : undefined,
    });
  };

  const extras = getCanvasExtrasSummary(diagram, canvasGraph);
  const hasExtras =
    extras.extraNodesCount > 0 || extras.extraCrossLinksCount > 0;

  const extrasLabelParts: string[] = [];
  if (extras.extraNodesCount > 0) {
    extrasLabelParts.push(`+${extras.extraNodesCount} nhánh con`);
  }
  if (extras.extraCrossLinksCount > 0) {
    extrasLabelParts.push(`+${extras.extraCrossLinksCount} nối chéo`);
  }

  const upgradeCanvasBar = (
    <div className="mb-2 flex flex-wrap items-center justify-end gap-1.5">
      {hasExtras && (
        <button
          type="button"
          onClick={openParallelCanvas}
          className="no-print inline-flex items-center gap-1 rounded-full border border-[var(--sem-def-border)] bg-[var(--hl-blue)] px-2.5 py-1 font-mono text-[10px] font-bold text-[var(--ink-primary)] transition hover:brightness-95"
          title="Nhánh con và nối chéo của bạn vẫn được lưu song song an toàn — bấm để mở Canvas"
        >
          <span>Đã lưu: {extrasLabelParts.join(" • ")}</span>
        </button>
      )}
      {canvasGraph && !hasExtras && (
        <span
          className="no-print inline-flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2 py-0.5 font-mono text-[9px] text-[var(--ink-muted)]"
          title="Dữ liệu Canvas đã liên kết song song với thẻ"
        >
          <RotateCcw className="h-2.5 w-2.5" />
          <span>Đồng bộ Canvas</span>
        </span>
      )}
      <button
        type="button"
        onClick={openParallelCanvas}
        className="no-print inline-flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2.5 py-1 font-mono text-[10px] font-semibold text-[var(--ink-primary)] transition hover:border-[var(--ink-primary)] hover:bg-[var(--hl-yellow)]"
        title="Mở Canvas trực quan hỗ trợ Zoom, Kéo thả, Chẻ nhiều tầng nhánh & Nối chéo"
      >
        <Network className="h-3 w-3" />
        <span>Mở Canvas Zoom / Chẻ nhánh</span>
      </button>
    </div>
  );

  if (diagram.kind === "flowchart") {
    return (
      <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
        {upgradeCanvasBar}
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
                            steps: diagram.steps.filter(
                              (s) => s.id !== step.id
                            ),
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

  if (diagram.kind === "venn") {
    return (
      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
        {upgradeCanvasBar}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-0">
          {/* Left Circle */}
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

          {/* Center Intersection */}
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

          {/* Right Circle */}
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
              onChange={(rightOnly) =>
                commitCardChange({ ...diagram, rightOnly })
              }
            />
          </div>
        </div>
      </div>
    );
  }

  if (diagram.kind === "tree") {
    return (
      <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
        {upgradeCanvasBar}
        {/* Root Node */}
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

        {/* Colored Branches */}
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
                style={{ backgroundColor: COLOR_CSS[br.color] }}
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

  // Spider Diagram (Sơ đồ Mạng Nhện)
  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      {upgradeCanvasBar}
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
            extras.directCustomChildrenByCardId[`card:spider:node:${node.id}`] ??
            0;
          return (
            <div
              key={node.id}
              className="rounded-xl border border-[var(--border-hairline)] p-3"
              style={{ backgroundColor: COLOR_CSS[node.color] }}
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
