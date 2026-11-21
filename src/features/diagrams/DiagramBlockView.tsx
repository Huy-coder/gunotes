"use client";

import React, { useEffect, useState } from "react";
import { Network, RotateCcw } from "lucide-react";
import { HighlightText } from "@/components/ui/HighlightText";
import {
  DIAGRAM_COLOR_CSS,
  FlowchartCardView,
  SpiderCardView,
  TreeCardView,
  VennCardView,
  type CardDiagramUnion,
} from "@/features/diagrams/DiagramCardViews";
import {
  buildCollapsedOutline,
  GraphCanvasWithFullscreen,
} from "@/features/diagrams/GraphCanvasModal";
import {
  getCanvasExtrasSummary,
  syncCardToGraph,
  syncGraphToCard,
} from "@/lib/graph-layout";
import type {
  CornellBlock,
  DiagramData,
  DiagramViewMode,
  GraphDiagram,
} from "@/types/study";

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
    patch: Partial<
      Pick<CornellBlock, "diagram" | "canvasGraph" | "diagramViewMode">
    >
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
                  style={{ paddingLeft: `${Math.min(depth - 1, 4) * 16}px` }}
                  className="flex items-start gap-1.5 text-xs leading-snug"
                >
                  {depth > 1 && (
                    <span className="mt-0.5 shrink-0 font-mono text-[11px] text-[var(--ink-muted)]">
                      ↳
                    </span>
                  )}
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full border border-black/15"
                    style={{ backgroundColor: DIAGRAM_COLOR_CSS[node.color] }}
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

  // Branch B: Structured Card Diagrams with Parallel Synced `canvasGraph`
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

  const commitCardChange = (nextCard: CardDiagramUnion) => {
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

  const headerBar = (
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
      <FlowchartCardView
        diagram={diagram}
        extras={extras}
        commitCardChange={commitCardChange}
        openParallelCanvas={openParallelCanvas}
        headerBar={headerBar}
      />
    );
  }
  if (diagram.kind === "venn") {
    return (
      <VennCardView
        diagram={diagram}
        commitCardChange={commitCardChange}
        headerBar={headerBar}
      />
    );
  }
  if (diagram.kind === "tree") {
    return (
      <TreeCardView
        diagram={diagram}
        extras={extras}
        commitCardChange={commitCardChange}
        openParallelCanvas={openParallelCanvas}
        headerBar={headerBar}
      />
    );
  }

  return (
    <SpiderCardView
      diagram={diagram}
      extras={extras}
      commitCardChange={commitCardChange}
      openParallelCanvas={openParallelCanvas}
      headerBar={headerBar}
    />
  );
}
