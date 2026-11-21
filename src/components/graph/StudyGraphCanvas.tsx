"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type Connection,
  type Edge,
  type OnNodeDrag,
} from "@xyflow/react";
import {
  GitBranch,
  Link2,
  Maximize2,
  Minimize2,
  Plus,
  ScanSearch,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { applyGraphLayout, pickEdgeHandles } from "@/lib/graph-layout";
import {
  StudyGraphNode,
  type StudyFlowNode,
} from "@/components/graph/StudyGraphNode";
import type {
  GraphDiagram,
  GraphEdgeItem,
  GraphLayoutMode,
  GraphNodeItem,
  HighlightColor,
} from "@/types/study";

const nodeTypes = {
  studyNode: StudyGraphNode,
};

const LAYOUT_OPTIONS: Array<{ id: GraphLayoutMode; label: string }> = [
  { id: "mindmap", label: "Mindmap" },
  { id: "tree", label: "Cây dọc" },
  { id: "radial", label: "Tỏa tâm" },
  { id: "flowchart", label: "Luồng" },
];

interface StudyGraphCanvasProps {
  diagram: GraphDiagram;
  onChange: (next: GraphDiagram) => void;
  heightClass?: string;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onClose?: () => void;
  closeLabel?: string;
}

function StudyGraphCanvasInner({
  diagram,
  onChange,
  heightClass = "h-[380px] sm:h-[440px]",
  onToggleFullscreen,
  isFullscreen = false,
  onClose,
  closeLabel = "Đóng Canvas",
}: StudyGraphCanvasProps) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  // Keep latest diagram/onChange in ref so node callbacks remain fresh without rebuilding nodeTypes
  const latestRef = useRef({ diagram, onChange });
  latestRef.current = { diagram, onChange };

  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkSourceId, setLinkSourceId] = useState<string>("");
  const [linkTargetId, setLinkTargetId] = useState<string>("");
  const [linkLabel, setLinkLabel] = useState<string>("liên kết với");

  const handleAddChild = useCallback((parentId: string) => {
    const { diagram: cur, onChange: commit } = latestRef.current;
    const parent = cur.nodes.find((n) => n.id === parentId);
    if (!parent) return;

    const palette: HighlightColor[] = ["b", "y", "g", "p"];
    const nextColor =
      parent.isRoot
        ? palette[cur.nodes.length % palette.length]
        : parent.color;

    const stamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 5);
    const newId = `custom:${stamp}-${rand}`;
    const newNode: GraphNodeItem = {
      id: newId,
      label: `Ý nhánh con ${cur.nodes.length}`,
      detail: "Nhấp đúp để sửa",
      color: nextColor,
      x: parent.x + 260,
      y: parent.y + 80,
      parentId,
    };
    const newEdge: GraphEdgeItem = {
      id: `custom-edge:${stamp}-${rand}`,
      source: parentId,
      target: newId,
    };

    const nextNodes = applyGraphLayout(
      [...cur.nodes, newNode],
      [...cur.edges, newEdge],
      cur.layout
    );
    commit({
      ...cur,
      nodes: nextNodes,
      edges: [...cur.edges, newEdge],
      hasGraphEdits: true,
    });
    window.setTimeout(() => {
      fitView({ duration: 260, padding: 0.22 }).catch(() => {});
    }, 40);
  }, [fitView]);

  const handleChangeNodeContent = useCallback(
    (
      nodeId: string,
      patch: { label?: string; detail?: string; color?: HighlightColor }
    ) => {
      const { diagram: cur, onChange: commit } = latestRef.current;
      commit({
        ...cur,
        nodes: cur.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)),
        hasGraphEdits: true,
      });
    },
    []
  );

  const handleDeleteNode = useCallback((nodeId: string) => {
    const { diagram: cur, onChange: commit } = latestRef.current;
    const target = cur.nodes.find((n) => n.id === nodeId);
    if (!target || target.isRoot) return;
    commit({
      ...cur,
      nodes: cur.nodes.filter((n) => n.id !== nodeId),
      edges: cur.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
      hasGraphEdits: true,
    });
    setSelectedEdgeId(null);
  }, []);

  const mappedNodes: StudyFlowNode[] = useMemo(
    () =>
      diagram.nodes.map((n) => ({
        id: n.id,
        type: "studyNode",
        position: { x: n.x, y: n.y },
        data: {
          variant: "editable",
          label: n.label,
          detail: n.detail,
          color: n.color,
          isRoot: n.isRoot,
          onAddChild: handleAddChild,
          onChangeContent: handleChangeNodeContent,
          onDelete: handleDeleteNode,
        },
      })),
    [diagram.nodes, handleAddChild, handleChangeNodeContent, handleDeleteNode]
  );

  const [rfNodes, setRfNodes, onNodesChange] =
    useNodesState<StudyFlowNode>(mappedNodes);

  useEffect(() => {
    setRfNodes(mappedNodes);
  }, [mappedNodes, setRfNodes]);

  const rfEdges: Edge[] = useMemo(() => {
    const posLookup = new Map(diagram.nodes.map((n) => [n.id, n]));
    return diagram.edges.map((e) => {
      const isSelected = e.id === selectedEdgeId;
      const isDashed = Boolean(e.dashed);
      const handles = pickEdgeHandles(
        posLookup.get(e.source),
        posLookup.get(e.target),
        diagram.layout
      );
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
        label: e.label,
        animated: isDashed,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
        },
        style: {
          strokeWidth: isSelected ? 2.6 : isDashed ? 2 : 1.75,
          strokeDasharray: isDashed ? "6 4" : undefined,
          stroke: isSelected
            ? "var(--ink-primary)"
            : isDashed
            ? "var(--sem-trap-border)"
            : "var(--ink-muted)",
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
  }, [diagram.edges, diagram.nodes, diagram.layout, selectedEdgeId]);

  const handleNodeDragStop: OnNodeDrag<StudyFlowNode> = useCallback(
    (_evt, draggedNode) => {
      const { diagram: cur, onChange: commit } = latestRef.current;
      commit({
        ...cur,
        nodes: cur.nodes.map((n) =>
          n.id === draggedNode.id
            ? {
                ...n,
                x: Math.round(draggedNode.position.x),
                y: Math.round(draggedNode.position.y),
              }
            : n
        ),
        hasGraphEdits: true,
      });
    },
    []
  );

  const handleConnect = useCallback((connection: Connection) => {
    if (
      !connection.source ||
      !connection.target ||
      connection.source === connection.target
    ) {
      return;
    }
    const { diagram: cur, onChange: commit } = latestRef.current;
    const edgeId = `custom-edge:${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const created: GraphEdgeItem = {
      id: edgeId,
      source: connection.source,
      target: connection.target,
      label: "liên kết chéo",
      dashed: true,
    };
    commit({
      ...cur,
      edges: [...cur.edges, created],
      hasGraphEdits: true,
    });
    setSelectedEdgeId(edgeId);
  }, []);

  const handleSwitchLayout = (nextLayout: GraphLayoutMode) => {
    const { diagram: cur, onChange: commit } = latestRef.current;
    const laidOut = applyGraphLayout(cur.nodes, cur.edges, nextLayout);
    commit({
      ...cur,
      layout: nextLayout,
      nodes: laidOut,
      hasGraphEdits: true,
    });
    window.setTimeout(() => {
      fitView({ duration: 280, padding: 0.22 }).catch(() => {});
    }, 40);
  };

  const handleAddStandaloneNode = () => {
    const { diagram: cur, onChange: commit } = latestRef.current;
    const root = cur.nodes.find((n) => n.isRoot) ?? cur.nodes[0];
    if (root) {
      handleAddChild(root.id);
      return;
    }
    const stamp = Date.now();
    const created: GraphNodeItem = {
      id: `custom:${stamp}-${Math.random().toString(36).slice(2, 5)}`,
      label: "Ý chủ đề mới",
      color: "y",
      x: 0,
      y: 0,
      isRoot: true,
    };
    commit({
      ...cur,
      nodes: [created],
      hasGraphEdits: true,
    });
  };

  const selectedEdge = diagram.edges.find((e) => e.id === selectedEdgeId);

  return (
    <div
      className={`relative flex flex-col overflow-hidden bg-[var(--bg-paper)] ${
        isFullscreen
          ? "rounded-none border-0"
          : "rounded-2xl border border-[var(--border-hairline)]"
      } ${heightClass}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Graph Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)]/95 px-2.5 py-2">
        {/* Auto-layout modes */}
        <div className="flex items-center gap-1 overflow-x-auto">
          <GitBranch className="mr-0.5 hidden h-3.5 w-3.5 shrink-0 text-[var(--ink-muted)] sm:block" />
          {LAYOUT_OPTIONS.map((opt) => {
            const active = diagram.layout === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSwitchLayout(opt.id)}
                className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium transition ${
                  active
                    ? "border-[var(--ink-primary)] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                    : "border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Canvas actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleAddStandaloneNode}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--ink-primary)] hover:border-[var(--ink-primary)]"
            title="Thêm nhánh ý mới"
          >
            <Plus className="h-3 w-3" />
            <span>Nhánh</span>
          </button>

          {diagram.nodes.length >= 2 && (
            <button
              type="button"
              onClick={() => {
                setLinkSourceId(diagram.nodes[0]?.id ?? "");
                setLinkTargetId(
                  diagram.nodes[1]?.id ?? diagram.nodes[0]?.id ?? ""
                );
                setLinkModalOpen((v) => !v);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--ink-primary)] hover:border-[var(--ink-primary)]"
              title="Tạo nối chéo giữa 2 nhánh bất kỳ"
            >
              <Link2 className="h-3 w-3" />
              <span className="hidden sm:inline">Nối chéo</span>
            </button>
          )}

          <div className="hidden items-center gap-0.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-1 py-0.5 sm:flex">
            <button
              type="button"
              onClick={() => zoomOut({ duration: 180 })}
              className="rounded-full p-0.5 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              title="Thu nhỏ (Zoom out)"
            >
              <ZoomOut className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => fitView({ duration: 240, padding: 0.2 })}
              className="rounded-full p-0.5 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              title="Căn vừa màn hình"
            >
              <ScanSearch className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => zoomIn({ duration: 180 })}
              className="rounded-full p-0.5 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              title="Phóng to (Zoom in)"
            >
              <ZoomIn className="h-3 w-3" />
            </button>
          </div>

          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--ink-primary)] hover:border-[var(--ink-primary)]"
              title={isFullscreen ? "Thu nhỏ lại" : "Mở toàn màn hình"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
              <span className="hidden md:inline">
                {isFullscreen ? "Thu gọn" : "Phóng to"}
              </span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--ink-primary)] transition hover:border-[var(--ink-primary)] hover:bg-[var(--sem-trap-bg)]"
              title={closeLabel}
            >
              <X className="h-3 w-3" />
              <span>{closeLabel}</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Cross-Link Creator Bar (Touch & Desktop friendly) */}
      {linkModalOpen && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border-hairline)] bg-[var(--bg-desk)] px-2.5 py-2 text-xs">
          <span className="font-mono text-[10px] font-bold uppercase text-[var(--ink-muted)]">
            Nối 2 ý:
          </span>
          <select
            value={linkSourceId}
            onChange={(e) => setLinkSourceId(e.target.value)}
            className="max-w-[140px] rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2 py-1 text-[11px] outline-none"
          >
            {diagram.nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label.slice(0, 32)}
              </option>
            ))}
          </select>
          <span className="font-mono text-[10px] text-[var(--ink-muted)]">
            →
          </span>
          <select
            value={linkTargetId}
            onChange={(e) => setLinkTargetId(e.target.value)}
            className="max-w-[140px] rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2 py-1 text-[11px] outline-none"
          >
            {diagram.nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label.slice(0, 32)}
              </option>
            ))}
          </select>
          <input
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            placeholder="Nhãn liên kết..."
            className="w-28 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2 py-1 text-[11px] outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (!linkSourceId || !linkTargetId || linkSourceId === linkTargetId) {
                return;
              }
              const edgeId = `custom-edge:${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
              onChange({
                ...diagram,
                edges: [
                  ...diagram.edges,
                  {
                    id: edgeId,
                    source: linkSourceId,
                    target: linkTargetId,
                    label: linkLabel.trim() || undefined,
                    dashed: true,
                  },
                ],
                hasGraphEdits: true,
              });
              setLinkModalOpen(false);
              setSelectedEdgeId(edgeId);
            }}
            className="rounded-full bg-[var(--accent-primary)] px-2.5 py-1 font-mono text-[10px] font-semibold text-[var(--accent-primary-fg)]"
          >
            Tạo nối
          </button>
          <button
            type="button"
            onClick={() => setLinkModalOpen(false)}
            className="rounded-full p-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* React Flow Interactive Surface */}
      <div className="relative min-h-0 flex-1">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          onNodesChange={onNodesChange}
          onNodeDragStop={handleNodeDragStop}
          onConnect={handleConnect}
          onEdgeClick={(_evt, edge) => setSelectedEdgeId(edge.id)}
          onPaneClick={() => setSelectedEdgeId(null)}
          fitView
          fitViewOptions={{ padding: 0.24 }}
          minZoom={0.25}
          maxZoom={2.2}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.2}
            color="var(--grid-line)"
          />
          <Controls showInteractive={false} position="bottom-left" />
          {isFullscreen && (
            <MiniMap
              className="hidden sm:block"
              pannable
              zoomable
              nodeColor="var(--hl-yellow)"
            />
          )}
        </ReactFlow>

        {/* Edge Inspector Pill */}
        {selectedEdge && (
          <div className="paper-shadow absolute right-3 bottom-3 left-14 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/95 px-3 py-2 text-xs backdrop-blur-md sm:left-auto sm:max-w-md">
            <span className="font-mono text-[10px] font-bold uppercase text-[var(--ink-muted)]">
              Liên kết:
            </span>
            <input
              value={selectedEdge.label ?? ""}
              onChange={(e) =>
                onChange({
                  ...diagram,
                  edges: diagram.edges.map((ed) =>
                    ed.id === selectedEdge.id
                      ? { ...ed, label: e.target.value }
                      : ed
                  ),
                  hasGraphEdits: true,
                })
              }
              placeholder="Nhãn mũi tên..."
              className="min-w-[110px] flex-1 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2 py-1 text-xs outline-none"
            />
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...diagram,
                  edges: diagram.edges.map((ed) =>
                    ed.id === selectedEdge.id
                      ? { ...ed, dashed: !ed.dashed }
                      : ed
                  ),
                  hasGraphEdits: true,
                })
              }
              className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2 py-0.5 font-mono text-[10px] font-semibold"
            >
              {selectedEdge.dashed ? "Nét đứt" : "Nét liền"}
            </button>
            <button
              type="button"
              onClick={() => {
                onChange({
                  ...diagram,
                  edges: diagram.edges.filter((ed) => ed.id !== selectedEdge.id),
                  hasGraphEdits: true,
                });
                setSelectedEdgeId(null);
              }}
              className="rounded-full p-1 text-[var(--ink-muted)] hover:bg-[var(--sem-trap-bg)] hover:text-[var(--ink-primary)]"
              title="Xóa đường nối"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedEdgeId(null)}
              className="rounded-full p-1 text-[var(--ink-muted)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function StudyGraphCanvas(props: StudyGraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <StudyGraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
