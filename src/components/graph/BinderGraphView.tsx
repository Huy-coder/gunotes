"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Edge,
} from "@xyflow/react";
import {
  ArrowRight,
  Hash,
  Network,
  ScanSearch,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  StudyGraphNode,
  type StudyFlowNode,
} from "@/components/graph/StudyGraphNode";
import { applyGraphLayout, pickEdgeHandles } from "@/lib/graph-layout";
import {
  getBinderToneVars,
  NOTE_TEMPLATE_META,
  SEMANTIC_META,
} from "@/lib/semantic-styles";
import { extractNoteWikiLinks, resolveWikiLink } from "@/lib/wiki-links";
import type {
  Binder,
  GraphEdgeItem,
  GraphNodeItem,
  Note,
} from "@/types/study";

const nodeTypes = {
  studyNode: StudyGraphNode,
};

type BinderGraphLayout = "radial" | "circle" | "tree";

interface BinderGraphViewProps {
  binder: Binder;
  notes: Note[];
  allNotes?: Note[];
  onClose?: () => void;
}

function BinderGraphViewInner({
  binder,
  notes,
  allNotes,
  onClose,
}: BinderGraphViewProps) {
  const router = useRouter();
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const [layout, setLayout] = useState<BinderGraphLayout>("radial");
  const [showTagLinks, setShowTagLinks] = useState(true);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const tone = getBinderToneVars(binder.coverTone);
  const lookupPool = allNotes ?? notes;

  const { builtNodes, builtEdges, linkCounts } = useMemo(() => {
    const gNodes: GraphNodeItem[] = [];
    const gEdges: GraphEdgeItem[] = [];
    const counts = new Map<string, number>();

    notes.forEach((n, idx) => {
      gNodes.push({
        id: n.id,
        label: n.title,
        detail: n.summary,
        color: idx % 2 === 0 ? "b" : "y",
        x: 0,
        y: 0,
        isRoot: Boolean(n.isPinned) || idx === 0,
      });
      counts.set(n.id, 0);
    });

    // 1. Explicit [[Wiki-Links]] inside binder notes
    const seenWikiPairs = new Set<string>();
    notes.forEach((src) => {
      const titles = extractNoteWikiLinks(src);
      titles.forEach((title) => {
        const tgt = resolveWikiLink(title, lookupPool);
        if (!tgt || tgt.id === src.id) return;
        // Include if target note is in this binder
        if (!notes.some((bn) => bn.id === tgt.id)) return;
        const pairKey = `${src.id}->${tgt.id}`;
        if (seenWikiPairs.has(pairKey)) return;
        seenWikiPairs.add(pairKey);

        gEdges.push({
          id: `bw-${src.id}-${tgt.id}`,
          source: src.id,
          target: tgt.id,
          label: "[[liên kết]]",
          dashed: false,
        });
        counts.set(src.id, (counts.get(src.id) ?? 0) + 1);
        counts.set(tgt.id, (counts.get(tgt.id) ?? 0) + 1);
      });
    });

    // 2. Shared #tags between notes (soft dashed edges)
    if (showTagLinks) {
      for (let i = 0; i < notes.length; i++) {
        for (let j = i + 1; j < notes.length; j++) {
          const a = notes[i];
          const b = notes[j];
          const sharedTag = a.tags.find((t) => b.tags.includes(t));
          if (!sharedTag) continue;
          // Don't clutter if already connected directly by wiki-link
          if (
            seenWikiPairs.has(`${a.id}->${b.id}`) ||
            seenWikiPairs.has(`${b.id}->${a.id}`)
          ) {
            continue;
          }
          gEdges.push({
            id: `bt-${a.id}-${b.id}`,
            source: a.id,
            target: b.id,
            label: sharedTag,
            dashed: true,
          });
          counts.set(a.id, (counts.get(a.id) ?? 0) + 1);
          counts.set(b.id, (counts.get(b.id) ?? 0) + 1);
        }
      }
    }

    let positioned: GraphNodeItem[];
    if (layout === "circle") {
      const count = Math.max(1, gNodes.length);
      const radius = count === 1 ? 0 : Math.max(210, count * 74);
      positioned = gNodes.map((node, idx) => {
        const angle = -Math.PI / 2 + (idx / count) * Math.PI * 2;
        return {
          ...node,
          x: Math.round(Math.cos(angle) * radius),
          y: Math.round(Math.sin(angle) * radius),
        };
      });
    } else {
      positioned = applyGraphLayout(
        gNodes,
        gEdges,
        layout === "tree" ? "tree" : "radial"
      );
    }

    const rfNodesList: StudyFlowNode[] = positioned.map((gn) => {
      const note = notes.find((n) => n.id === gn.id)!;
      const dominantType = note.blocks[0]?.type ?? "def";
      const tplLabel =
        NOTE_TEMPLATE_META.find((t) => t.id === note.template)?.label ??
        "Cornell";
      return {
        id: note.id,
        type: "studyNode",
        position: { x: gn.x, y: gn.y },
        data: {
          variant: "visualize",
          badge: `${tplLabel.toUpperCase()} • ${note.blocks.length} KHỐI`,
          label: note.title,
          detail: note.summary,
          tags: note.tags,
          isRoot: gn.isRoot,
          bgVar: gn.isRoot ? tone.bg : "var(--bg-paper)",
          borderVar: gn.isRoot
            ? "var(--ink-primary)"
            : SEMANTIC_META[dominantType]?.borderVar ?? tone.border,
        },
      };
    });

    const posLookup = new Map(positioned.map((n) => [n.id, n]));
    const rfEdgesList: Edge[] = gEdges.map((e) => {
      const handles = pickEdgeHandles(
        posLookup.get(e.source),
        posLookup.get(e.target),
        layout
      );
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
        label: e.label,
        animated: !e.dashed,
        markerEnd: e.dashed
          ? undefined
          : {
              type: MarkerType.ArrowClosed,
              width: 15,
              height: 15,
            },
        style: {
          strokeWidth: e.dashed ? 1.5 : 2.2,
          strokeDasharray: e.dashed ? "5 4" : undefined,
          stroke: e.dashed ? "var(--ink-muted)" : "var(--sem-def-border)",
        },
        labelStyle: {
          fontSize: 10,
          fontWeight: 600,
        },
        labelShowBg: true,
        labelBgPadding: [6, 3] as [number, number],
        labelBgBorderRadius: 6,
      };
    });

    return {
      builtNodes: rfNodesList,
      builtEdges: rfEdgesList,
      linkCounts: counts,
    };
  }, [notes, lookupPool, layout, showTagLinks, tone.bg, tone.border]);

  const [rfNodes, setRfNodes, onNodesChange] =
    useNodesState<StudyFlowNode>(builtNodes);

  useEffect(() => {
    setRfNodes(builtNodes);
    const t = window.setTimeout(() => {
      fitView({ duration: 280, padding: 0.24 }).catch(() => {});
    }, 50);
    return () => window.clearTimeout(t);
  }, [builtNodes, setRfNodes, fitView]);

  const selectedNote = notes.find((n) => n.id === selectedNoteId);

  return (
    <div className="paper-shadow mt-5 flex h-[500px] flex-col overflow-hidden rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] sm:h-[580px]">
      {/* Graph Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)]/95 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[var(--ink-muted)] uppercase">
            <Network className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Đồ thị Sổ:</span>
          </span>

          {(
            [
              { id: "radial", label: "Tỏa tâm" },
              { id: "circle", label: "Vòng tròn" },
              { id: "tree", label: "Phân tầng" },
            ] as Array<{ id: BinderGraphLayout; label: string }>
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setLayout(m.id)}
              className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-medium transition ${
                layout === m.id
                  ? "border-[var(--ink-primary)] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                  : "border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              }`}
            >
              {m.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowTagLinks((v) => !v)}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-medium transition ${
              showTagLinks
                ? "border-[var(--ink-primary)] bg-[var(--hl-yellow)] text-[var(--ink-primary)]"
                : "border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--ink-muted)]"
            }`}
          >
            <Hash className="h-3 w-3" />
            <span>Liên kết #tag</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-1.5 py-0.5">
            <button
              type="button"
              onClick={() => zoomOut({ duration: 180 })}
              className="rounded-full p-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              title="Thu nhỏ"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => fitView({ duration: 240, padding: 0.24 })}
              className="rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              title="Căn vừa khung"
            >
              <ScanSearch className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => zoomIn({ duration: 180 })}
              className="rounded-full p-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              title="Phóng to"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2.5 py-1 font-mono text-[10px] font-semibold text-[var(--ink-primary)] transition hover:border-[var(--ink-primary)] hover:bg-[var(--sem-trap-bg)]"
              title="Quay lại danh sách trang"
            >
              <X className="h-3 w-3" />
              <span>Đóng</span>
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative min-h-0 flex-1">
        <ReactFlow
          nodes={rfNodes}
          edges={builtEdges}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          onNodesChange={onNodesChange}
          onNodeClick={(_evt, node) => setSelectedNoteId(node.id)}
          onNodeDoubleClick={(_evt, node) =>
            router.push(`/binder/${binder.id}/note/${node.id}`)
          }
          onPaneClick={() => setSelectedNoteId(null)}
          fitView
          fitViewOptions={{ padding: 0.24 }}
          minZoom={0.25}
          maxZoom={2.2}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={22}
            size={1.2}
            color="var(--grid-line)"
          />
          <Controls showInteractive={false} position="bottom-left" />
          <MiniMap
            className="hidden sm:block"
            pannable
            zoomable
            nodeColor="var(--hl-blue)"
          />
        </ReactFlow>

        {/* Selected Note Quick Card */}
        {selectedNote && (
          <div className="paper-shadow absolute right-3 bottom-3 left-3 z-20 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/98 p-3.5 backdrop-blur-md sm:left-auto sm:w-80">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono text-[10px] text-[var(--ink-muted)] uppercase">
                  {linkCounts.get(selectedNote.id) ?? 0} kết nối trong sổ •{" "}
                  {selectedNote.blocks.length} khối
                </div>
                <h3 className="mt-0.5 text-sm font-bold leading-snug">
                  {selectedNote.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNoteId(null)}
                className="shrink-0 rounded-full p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-[var(--ink-muted)]">
              {selectedNote.summary}
            </p>
            <button
              type="button"
              onClick={() =>
                router.push(`/binder/${binder.id}/note/${selectedNote.id}`)
              }
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--accent-primary-fg)]"
            >
              <span>Mở trang ghi chú</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Non-overlapping Footer Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-hairline)] bg-[var(--bg-elevated)]/90 px-3 py-1.5 font-mono text-[10px] text-[var(--ink-muted)]">
        <span>Nét liền: liên kết [[Trang]] • Nét đứt: chung #tag</span>
        <span>Chạm thẻ để xem tóm tắt • Nhấp đúp thẻ để mở trang</span>
      </div>
    </div>
  );
}

export function BinderGraphView(props: BinderGraphViewProps) {
  return (
    <ReactFlowProvider>
      <BinderGraphViewInner {...props} />
    </ReactFlowProvider>
  );
}
