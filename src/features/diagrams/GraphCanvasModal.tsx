"use client";

import React from "react";
import { createPortal } from "react-dom";
import { Network, X } from "lucide-react";
import { StudyGraphCanvas } from "@/components/graph/StudyGraphCanvas";
import type { GraphDiagram, GraphNodeItem } from "@/types/study";

export function buildCollapsedOutline(diagram: GraphDiagram): {
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

export function GraphCanvasWithFullscreen({
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
