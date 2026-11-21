"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Connection,
} from "@xyflow/react";
import {
  ArrowRight,
  GitBranch,
  Layers,
  Link2,
  Network,
  Pencil,
  Plus,
  ScanSearch,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  StudyGraphNode,
  type StudyFlowNode,
} from "@/components/graph/StudyGraphNode";
import { HighlightText } from "@/components/ui/HighlightText";
import {
  buildNoteKnowledgeGraph,
  type InspectedItem,
} from "@/lib/graph/note-graph-builder";
import { useAppStore } from "@/store/useAppStore";
import type { GraphLayoutMode, Note } from "@/types/study";

const nodeTypes = {
  studyNode: StudyGraphNode,
};

interface NoteVisualizeModalProps {
  open: boolean;
  note: Note;
  allNotes: Note[];
  onClose: () => void;
  onSelectBlockForEdit?: (blockId: string) => void;
}

function NoteVisualizeCanvasInner({
  note,
  allNotes,
  onClose,
  onSelectBlockForEdit,
}: Omit<NoteVisualizeModalProps, "open">) {
  const router = useRouter();
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const addBlockLink = useAppStore((s) => s.addBlockLink);
  const updateBlockLinkLabel = useAppStore((s) => s.updateBlockLinkLabel);
  const removeBlockLink = useAppStore((s) => s.removeBlockLink);
  const showToast = useAppStore((s) => s.showToast);

  const [layout, setLayout] = useState<GraphLayoutMode>("mindmap");
  const [showSubNodes, setShowSubNodes] = useState(true);
  const [showWikiLinks, setShowWikiLinks] = useState(true);

  const [inspected, setInspected] = useState<InspectedItem | null>(null);
  const [selectedCrossEdgeId, setSelectedCrossEdgeId] = useState<string | null>(
    null
  );

  // Explicit touch-friendly "+ Nối 2 ý" builder
  const [connectBarOpen, setConnectBarOpen] = useState(false);
  const [srcBlockId, setSrcBlockId] = useState<string>(note.blocks[0]?.id ?? "");
  const [tgtBlockId, setTgtBlockId] = useState<string>(
    note.blocks[1]?.id ?? note.blocks[0]?.id ?? ""
  );
  const [customLinkLabel, setCustomLinkLabel] = useState("liên kết tới");

  const { builtNodes, builtEdges, inspectMap } = useMemo(
    () =>
      buildNoteKnowledgeGraph({
        note,
        allNotes,
        layout,
        showSubNodes,
        showWikiLinks,
        selectedCrossEdgeId,
      }),
    [note, allNotes, layout, showSubNodes, showWikiLinks, selectedCrossEdgeId]
  );

  const [rfNodes, setRfNodes, onNodesChange] =
    useNodesState<StudyFlowNode>(builtNodes);

  useEffect(() => {
    setRfNodes(builtNodes);
    const t = window.setTimeout(() => {
      fitView({ duration: 280, padding: 0.2 }).catch(() => {});
    }, 50);
    return () => window.clearTimeout(t);
  }, [builtNodes, setRfNodes, fitView]);

  const handleConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target) return;
      if (
        !conn.source.startsWith("blk-node:") ||
        !conn.target.startsWith("blk-node:")
      ) {
        showToast("Chỉ có thể kéo nối chéo giữa 2 Khối kiến thức trong trang.");
        return;
      }
      const sourceBlockId = conn.source.replace("blk-node:", "");
      const targetBlockId = conn.target.replace("blk-node:", "");
      const created = addBlockLink(note.id, {
        sourceBlockId,
        targetBlockId,
        label: "liên kết ý",
      });
      if (created) {
        setSelectedCrossEdgeId(`cross:${created.id}`);
        showToast("Đã lưu liên kết chéo giữa 2 khối!");
      } else {
        showToast("Hai khối này đã có đường nối chéo rồi.");
      }
    },
    [addBlockLink, note.id, showToast]
  );

  const selectedCrossLink = selectedCrossEdgeId?.startsWith("cross:")
    ? (note.blockLinks ?? []).find(
        (l) => `cross:${l.id}` === selectedCrossEdgeId
      )
    : undefined;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Visualize Bản đồ Liên kết toàn trang"
      className="fixed inset-0 z-[100] flex h-dvh w-screen flex-col bg-[var(--bg-desk)]"
    >
      {/* Modal Header */}
      <header className="flex flex-col gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2.5 sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]">
              <Network className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] font-bold tracking-wider text-[var(--ink-muted)] uppercase">
                  VISUALIZE • BẢN ĐỒ LIÊN KẾT
                </span>
              </div>
              <h2 className="truncate text-sm font-bold sm:text-base">
                {note.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--ink-primary)]"
          >
            <X className="h-3.5 w-3.5" />
            <span>Đóng</span>
          </button>
        </div>

        {/* Interactive Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Layout Modes */}
            <div className="flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-desk)] p-0.5">
              {(
                [
                  { id: "mindmap", label: "Mindmap" },
                  { id: "tree", label: "Cây dọc" },
                  { id: "radial", label: "Tỏa tâm" },
                ] as Array<{ id: GraphLayoutMode; label: string }>
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setLayout(m.id)}
                  className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium transition ${
                    layout === m.id
                      ? "bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Visibility Toggles */}
            <button
              type="button"
              onClick={() => setShowSubNodes((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px] font-medium transition ${
                showSubNodes
                  ? "border-[var(--ink-primary)] bg-[var(--hl-yellow)] text-[var(--ink-primary)]"
                  : "border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--ink-muted)]"
              }`}
            >
              <GitBranch className="h-3 w-3" />
              <span>Nhánh con</span>
            </button>

            <button
              type="button"
              onClick={() => setShowWikiLinks((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px] font-medium transition ${
                showWikiLinks
                  ? "border-[var(--ink-primary)] bg-[var(--hl-blue)] text-[var(--ink-primary)]"
                  : "border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--ink-muted)]"
              }`}
            >
              <Link2 className="h-3 w-3" />
              <span>[[Trang]]</span>
            </button>

            {note.blocks.length >= 2 && (
              <button
                type="button"
                onClick={() => setConnectBarOpen((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 py-1 font-mono text-[11px] font-semibold hover:border-[var(--ink-primary)]"
              >
                <Plus className="h-3 w-3" />
                <span>Nối 2 ý</span>
              </button>
            )}
          </div>

          {/* Explicit Zoom Controls */}
          <div className="flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-1.5 py-0.5">
            <button
              type="button"
              onClick={() => zoomOut({ duration: 180 })}
              className="rounded-full p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)]"
              title="Thu nhỏ"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => fitView({ duration: 240, padding: 0.2 })}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)]"
              title="Căn vừa toàn sơ đồ"
            >
              <ScanSearch className="h-3 w-3" />
              <span>Vừa khung</span>
            </button>
            <button
              type="button"
              onClick={() => zoomIn({ duration: 180 })}
              className="rounded-full p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)]"
              title="Phóng to"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Touch-friendly "+ Nối 2 ý" Bar */}
        {connectBarOpen && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-desk)] px-3 py-2 text-xs">
            <span className="font-mono text-[10px] font-bold uppercase text-[var(--ink-muted)]">
              Liên kết chéo 2 khối:
            </span>
            <select
              value={srcBlockId}
              onChange={(e) => setSrcBlockId(e.target.value)}
              className="max-w-[160px] rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2 py-1 text-xs outline-none"
            >
              {note.blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {(b.cue || b.title || b.type).slice(0, 34)}
                </option>
              ))}
            </select>
            <ArrowRight className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
            <select
              value={tgtBlockId}
              onChange={(e) => setTgtBlockId(e.target.value)}
              className="max-w-[160px] rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2 py-1 text-xs outline-none"
            >
              {note.blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {(b.cue || b.title || b.type).slice(0, 34)}
                </option>
              ))}
            </select>
            <input
              value={customLinkLabel}
              onChange={(e) => setCustomLinkLabel(e.target.value)}
              placeholder="Nhãn quan hệ..."
              className="w-32 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2 py-1 text-xs outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (!srcBlockId || !tgtBlockId || srcBlockId === tgtBlockId) {
                  showToast("Hãy chọn 2 khối kiến thức khác nhau để nối.");
                  return;
                }
                const created = addBlockLink(note.id, {
                  sourceBlockId: srcBlockId,
                  targetBlockId: tgtBlockId,
                  label: customLinkLabel.trim() || "liên kết ý",
                });
                if (created) {
                  setConnectBarOpen(false);
                  setSelectedCrossEdgeId(`cross:${created.id}`);
                  showToast("Đã thêm liên kết chéo mới!");
                } else {
                  showToast("Hai khối này đã có đường nối rồi.");
                }
              }}
              className="rounded-full bg-[var(--accent-primary)] px-3 py-1 font-mono text-[11px] font-semibold text-[var(--accent-primary-fg)]"
            >
              Lưu liên kết
            </button>
          </div>
        )}
      </header>

      {/* Main Canvas Area */}
      <div className="relative min-h-0 flex-1">
        <ReactFlow
          nodes={rfNodes}
          edges={builtEdges}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          onNodesChange={onNodesChange}
          onConnect={handleConnect}
          onNodeClick={(_evt, node) => {
            setSelectedCrossEdgeId(null);
            setInspected(inspectMap.get(node.id) ?? null);
          }}
          onEdgeClick={(_evt, edge) => {
            if (edge.id.startsWith("cross:")) {
              setSelectedCrossEdgeId(edge.id);
              setInspected(null);
            }
          }}
          onPaneClick={() => {
            setInspected(null);
            setSelectedCrossEdgeId(null);
          }}
          fitView
          fitViewOptions={{ padding: 0.22 }}
          minZoom={0.2}
          maxZoom={2.4}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={22}
            size={1.25}
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

        {/* Selected Cross-Link Edge Editor */}
        {selectedCrossLink && (
          <div className="paper-shadow absolute right-3 bottom-4 left-3 z-30 flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/95 px-3.5 py-2.5 text-xs backdrop-blur-md sm:right-auto sm:left-16 sm:max-w-md">
            <span className="font-mono text-[10px] font-bold uppercase text-[var(--ink-muted)]">
              Liên kết chéo:
            </span>
            <input
              value={selectedCrossLink.label ?? ""}
              onChange={(e) =>
                updateBlockLinkLabel(
                  note.id,
                  selectedCrossLink.id,
                  e.target.value
                )
              }
              placeholder="Nhãn mối quan hệ..."
              className="min-w-[130px] flex-1 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2.5 py-1 text-xs outline-none"
            />
            <button
              type="button"
              onClick={() => {
                removeBlockLink(note.id, selectedCrossLink.id);
                setSelectedCrossEdgeId(null);
                showToast("Đã xóa liên kết chéo");
              }}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--sem-trap-border)] bg-[var(--sem-trap-bg)] px-2.5 py-1 font-mono text-[10px] font-bold text-[var(--ink-primary)]"
            >
              <Trash2 className="h-3 w-3" />
              <span>Xóa</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCrossEdgeId(null)}
              className="rounded-full p-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Node Detail Inspector (Desktop Right Panel / Mobile Bottom Drawer) */}
        {inspected && (
          <aside className="paper-shadow absolute right-3 bottom-3 left-3 z-30 max-h-[46vh] overflow-y-auto rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-paper)]/98 p-4 backdrop-blur-md sm:top-4 sm:right-4 sm:bottom-auto sm:left-auto sm:max-h-[calc(100vh-145px)] sm:w-80">
            <div className="flex items-start justify-between gap-2 border-b border-[var(--border-hairline)] pb-2.5">
              <div className="min-w-0">
                <span className="font-mono text-[10px] font-bold tracking-wider text-[var(--ink-muted)] uppercase">
                  {inspected.badge}
                </span>
                <h3 className="mt-0.5 text-sm font-bold leading-snug">
                  <HighlightText text={inspected.title} disableWikiNavigation />
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspected(null)}
                className="shrink-0 rounded-full p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)]"
                aria-label="Đóng chi tiết"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 text-xs leading-relaxed sm:text-sm">
              <HighlightText text={inspected.content} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {inspected.targetNote && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push(
                      `/binder/${inspected.targetNote!.binderId}/note/${
                        inspected.targetNote!.id
                      }`
                    );
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--accent-primary-fg)]"
                >
                  <span>Mở trang này</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}

              {inspected.blockId && onSelectBlockForEdit && (
                <button
                  type="button"
                  onClick={() => onSelectBlockForEdit(inspected.blockId!)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3.5 py-1.5 text-xs font-semibold hover:border-[var(--ink-primary)]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Sửa khối này</span>
                </button>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Non-overlapping Modal Footer Hint */}
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-hairline)] bg-[var(--bg-paper)] px-4 py-1.5 font-mono text-[10px] text-[var(--ink-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <Layers className="h-3 w-3" />
          <span>Cuộn để Zoom • Kéo nền để Di chuyển • Chạm thẻ để xem chi tiết</span>
        </span>
        <span className="hidden sm:inline">
          Kéo chấm tròn giữa 2 Khối hoặc bấm "+ Nối 2 ý" để tạo liên kết chéo • Esc để đóng
        </span>
      </footer>
    </div>
  );
}

export function NoteVisualizeModal(props: NoteVisualizeModalProps) {
  useEffect(() => {
    if (!props.open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [props]);

  if (!props.open || typeof document === "undefined") return null;

  return createPortal(
    <ReactFlowProvider>
      <NoteVisualizeCanvasInner
        note={props.note}
        allNotes={props.allNotes}
        onClose={props.onClose}
        onSelectBlockForEdit={props.onSelectBlockForEdit}
      />
    </ReactFlowProvider>,
    document.body
  );
}
