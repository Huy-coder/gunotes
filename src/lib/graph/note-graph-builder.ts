import { MarkerType, type Edge } from "@xyflow/react";
import type { StudyFlowNode } from "@/components/graph/StudyGraphNode";
import {
  applyGraphLayout,
  diagramToGraph,
  pickEdgeHandles,
  syncCardToGraph,
} from "@/lib/graph-layout";
import { stripStudyMarkup } from "@/lib/highlight/highlight-markup";
import { SEMANTIC_META } from "@/lib/semantic-styles";
import {
  extractWikiLinks,
  getBacklinks,
  resolveWikiLink,
} from "@/lib/wiki-links";
import type {
  GraphEdgeItem,
  GraphLayoutMode,
  GraphNodeItem,
  Note,
} from "@/types/study";

export interface InspectedItem {
  nodeId: string;
  kind: "root" | "block" | "sub" | "wiki";
  badge: string;
  title: string;
  content: string;
  blockId?: string;
  targetNote?: Note;
}

export function safeShortExcerpt(raw: string, maxLen = 110): string {
  const cleaned = stripStudyMarkup(raw).replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLen) return cleaned;
  const sliced = cleaned.slice(0, maxLen);
  const dollarCount = (sliced.match(/\$/g) ?? []).length;
  if (dollarCount % 2 === 1) {
    const lastDollar = sliced.lastIndexOf("$");
    if (lastDollar > 12) return `${sliced.slice(0, lastDollar).trim()}...`;
  }
  return `${sliced}...`;
}

export function buildNoteKnowledgeGraph({
  note,
  allNotes,
  layout,
  showSubNodes,
  showWikiLinks,
  selectedCrossEdgeId,
}: {
  note: Note;
  allNotes: Note[];
  layout: GraphLayoutMode;
  showSubNodes: boolean;
  showWikiLinks: boolean;
  selectedCrossEdgeId: string | null;
}): {
  builtNodes: StudyFlowNode[];
  builtEdges: Edge[];
  inspectMap: Map<string, InspectedItem>;
} {
  const gNodes: GraphNodeItem[] = [];
  const gEdges: GraphEdgeItem[] = [];
  const metaByNodeId = new Map<
    string,
    {
      bgVar?: string;
      borderVar?: string;
      badge: string;
      isWikiLink?: boolean;
      tags?: string[];
      inspect: InspectedItem;
    }
  >();

  // 1. Central Root Note Node
  const rootId = "vis-root";
  gNodes.push({
    id: rootId,
    label: note.title,
    detail: `${note.blocks.length} khối • ${note.summary.slice(0, 75)}${
      note.summary.length > 75 ? "..." : ""
    }`,
    color: "y",
    x: 0,
    y: 0,
    isRoot: true,
  });
  metaByNodeId.set(rootId, {
    bgVar: "var(--bg-elevated)",
    borderVar: "var(--ink-primary)",
    badge: "TRANG HIỆN TẠI",
    tags: note.tags,
    inspect: {
      nodeId: rootId,
      kind: "root",
      badge: "TRANG HIỆN TẠI",
      title: note.title,
      content: note.summary,
    },
  });

  const addedWikiNoteIds = new Set<string>();

  // 2. Semantic Block Nodes
  note.blocks.forEach((blk) => {
    const blkNodeId = `blk-node:${blk.id}`;
    const meta = SEMANTIC_META[blk.type];
    const badge = blk.title ?? meta.badge;
    gNodes.push({
      id: blkNodeId,
      label: blk.cue || badge,
      detail: safeShortExcerpt(blk.content),
      color: "b",
      x: 0,
      y: 0,
      parentId: rootId,
    });
    gEdges.push({
      id: `e-root-${blk.id}`,
      source: rootId,
      target: blkNodeId,
    });
    metaByNodeId.set(blkNodeId, {
      bgVar: meta.bgVar,
      borderVar: meta.borderVar,
      badge,
      inspect: {
        nodeId: blkNodeId,
        kind: "block",
        badge,
        title: blk.cue || badge,
        content: blk.content,
        blockId: blk.id,
      },
    });

    // 3. Expanded Multi-level Sub-Nodes for Diagram Blocks
    if (showSubNodes && blk.type === "diagram" && blk.diagram) {
      const subGraph = blk.canvasGraph
        ? syncCardToGraph(blk.diagram, blk.canvasGraph)
        : diagramToGraph(blk.diagram);
      const rawRoot =
        blk.diagram.kind !== "flowchart"
          ? subGraph.nodes.find((n) => n.isRoot) ?? subGraph.nodes[0]
          : undefined;
      const dropRootWrapper =
        Boolean(rawRoot) &&
        subGraph.nodes.length > 1 &&
        subGraph.edges.some((e) => e.source === rawRoot?.id);

      const remapId = (subId: string) =>
        dropRootWrapper && subId === rawRoot?.id
          ? blkNodeId
          : `sub:${blk.id}:${subId}`;

      subGraph.nodes.forEach((sn) => {
        if (dropRootWrapper && sn.id === rawRoot?.id) return;
        const sid = remapId(sn.id);
        gNodes.push({
          id: sid,
          label: sn.label,
          detail: sn.detail,
          color: sn.color,
          x: 0,
          y: 0,
          parentId: sn.parentId ? remapId(sn.parentId) : blkNodeId,
        });
        metaByNodeId.set(sid, {
          badge: "NHÁNH SƠ ĐỒ",
          inspect: {
            nodeId: sid,
            kind: "sub",
            badge: `NHÁNH TỪ: ${badge}`,
            title: sn.label,
            content: sn.detail ?? sn.label,
            blockId: blk.id,
          },
        });
      });

      if (!dropRootWrapper && subGraph.nodes[0]) {
        gEdges.push({
          id: `e-diag-root-${blk.id}`,
          source: blkNodeId,
          target: remapId(subGraph.nodes[0].id),
        });
      }

      subGraph.edges.forEach((se) => {
        const src = remapId(se.source);
        const tgt = remapId(se.target);
        if (src === tgt) return;
        gEdges.push({
          id: `esub-${blk.id}-${se.id}`,
          source: src,
          target: tgt,
          label: se.label,
          dashed: se.dashed,
        });
      });
    }

    // 4. Outgoing [[Wiki-Links]] inside Block
    if (showWikiLinks) {
      const titles = extractWikiLinks(
        `${blk.cue}\n${blk.content}\n${blk.action ?? ""}`
      );
      titles.forEach((t) => {
        const target = resolveWikiLink(t, allNotes);
        if (!target || target.id === note.id) return;
        const wId = `wiki:${target.id}`;
        if (!addedWikiNoteIds.has(target.id)) {
          addedWikiNoteIds.add(target.id);
          gNodes.push({
            id: wId,
            label: target.title,
            detail: safeShortExcerpt(target.summary, 95),
            color: "b",
            x: 0,
            y: 0,
            parentId: blkNodeId,
          });
          metaByNodeId.set(wId, {
            bgVar: "var(--bg-elevated)",
            borderVar: "var(--sem-def-border)",
            badge: "[[TRANG LIÊN KẾT]]",
            isWikiLink: true,
            tags: target.tags,
            inspect: {
              nodeId: wId,
              kind: "wiki",
              badge: "TRANG LIÊN KẾT [[]]",
              title: target.title,
              content: target.summary,
              targetNote: target,
            },
          });
        }
        gEdges.push({
          id: `ewiki-${blk.id}-${target.id}`,
          source: blkNodeId,
          target: wId,
          label: "tham chiếu",
          dashed: true,
        });
      });
    }
  });

  // 5. Outgoing Summary [[Wiki-Links]] & Incoming Backlinks
  if (showWikiLinks) {
    extractWikiLinks(note.summary).forEach((t) => {
      const target = resolveWikiLink(t, allNotes);
      if (!target || target.id === note.id) return;
      const wId = `wiki:${target.id}`;
      if (!addedWikiNoteIds.has(target.id)) {
        addedWikiNoteIds.add(target.id);
        gNodes.push({
          id: wId,
          label: target.title,
          detail: safeShortExcerpt(target.summary, 95),
          color: "b",
          x: 0,
          y: 0,
          parentId: rootId,
        });
        metaByNodeId.set(wId, {
          bgVar: "var(--bg-elevated)",
          borderVar: "var(--sem-def-border)",
          badge: "[[TRANG LIÊN KẾT]]",
          isWikiLink: true,
          tags: target.tags,
          inspect: {
            nodeId: wId,
            kind: "wiki",
            badge: "TRANG LIÊN KẾT [[]]",
            title: target.title,
            content: target.summary,
            targetNote: target,
          },
        });
      }
      gEdges.push({
        id: `ewiki-sum-${target.id}`,
        source: rootId,
        target: wId,
        label: "nhắc tới",
        dashed: true,
      });
    });

    getBacklinks(note, allNotes).forEach(({ note: sourceNote, excerpt }) => {
      const wId = `wiki:${sourceNote.id}`;
      if (!addedWikiNoteIds.has(sourceNote.id)) {
        addedWikiNoteIds.add(sourceNote.id);
        gNodes.push({
          id: wId,
          label: sourceNote.title,
          detail: excerpt,
          color: "g",
          x: 0,
          y: 0,
          parentId: rootId,
        });
        metaByNodeId.set(wId, {
          bgVar: "var(--bg-elevated)",
          borderVar: "var(--sem-ex-border)",
          badge: "[[BACKLINK ĐẾN]]",
          isWikiLink: true,
          tags: sourceNote.tags,
          inspect: {
            nodeId: wId,
            kind: "wiki",
            badge: "ĐƯỢC NHẮC TỚI Ở",
            title: sourceNote.title,
            content: excerpt,
            targetNote: sourceNote,
          },
        });
      }
      gEdges.push({
        id: `eblink-${sourceNote.id}`,
        source: wId,
        target: rootId,
        label: "nhắc trang này",
        dashed: true,
      });
    });
  }

  // 6. Persisted Cross-Links between Blocks
  (note.blockLinks ?? []).forEach((lnk) => {
    const hasSrc = note.blocks.some((b) => b.id === lnk.sourceBlockId);
    const hasTgt = note.blocks.some((b) => b.id === lnk.targetBlockId);
    if (!hasSrc || !hasTgt) return;
    gEdges.push({
      id: `cross:${lnk.id}`,
      source: `blk-node:${lnk.sourceBlockId}`,
      target: `blk-node:${lnk.targetBlockId}`,
      label: lnk.label || "liên kết",
      dashed: true,
    });
  });

  const laidOut = applyGraphLayout(gNodes, gEdges, layout);

  const builtNodes: StudyFlowNode[] = laidOut.map((n) => {
    const info = metaByNodeId.get(n.id);
    return {
      id: n.id,
      type: "studyNode",
      position: { x: n.x, y: n.y },
      data: {
        variant: "visualize",
        label: n.label,
        detail: n.detail,
        color: n.color,
        bgVar: info?.bgVar,
        borderVar: info?.borderVar,
        badge: info?.badge,
        isRoot: n.isRoot,
        isWikiLink: info?.isWikiLink,
        tags: info?.tags,
      },
    };
  });

  const posLookup = new Map(laidOut.map((n) => [n.id, n]));
  const builtEdges: Edge[] = gEdges.map((e) => {
    const isCross = e.id.startsWith("cross:");
    const isSelected = e.id === selectedCrossEdgeId;
    const isDashed = Boolean(e.dashed);
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
      animated: isCross || e.id.startsWith("ewiki") || e.id.startsWith("eblink"),
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 15,
        height: 15,
      },
      style: {
        strokeWidth: isSelected ? 2.8 : isCross ? 2.1 : 1.7,
        strokeDasharray: isDashed ? "6 4" : undefined,
        stroke: isSelected
          ? "var(--ink-primary)"
          : isCross
          ? "var(--sem-trap-border)"
          : e.id.startsWith("ewiki") || e.id.startsWith("eblink")
          ? "var(--sem-def-border)"
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

  const inspectMap = new Map<string, InspectedItem>();
  metaByNodeId.forEach((v, k) => inspectMap.set(k, v.inspect));

  return { builtNodes, builtEdges, inspectMap };
}
