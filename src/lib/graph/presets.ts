import { applyGraphLayout } from "@/lib/graph/layout-engine";
import type {
  GraphDiagram,
  GraphEdgeItem,
  GraphLayoutMode,
  GraphNodeItem,
} from "@/types/study";

/**
 * Generates a starter multi-level branching GraphDiagram with 3 main branches,
 * a nested sub-branch (Nhánh 4 chẻ từ Nhánh 1), and a dashed cross-link.
 */
export function createMultiLevelGraphPreset(
  layout: GraphLayoutMode = "mindmap"
): GraphDiagram {
  const stamp = Date.now();
  const rootId = `gn-${stamp}-root`;
  const b1Id = `gn-${stamp}-b1`;
  const b2Id = `gn-${stamp}-b2`;
  const b3Id = `gn-${stamp}-b3`;
  const b4Id = `gn-${stamp}-b4`;

  const rawNodes: GraphNodeItem[] = [
    {
      id: rootId,
      label: "Chủ đề trọng tâm",
      detail: "Bấm '+ Nhánh con' trên bất kỳ thẻ nào",
      color: "y",
      x: 0,
      y: 0,
      isRoot: true,
    },
    {
      id: b1Id,
      label: "Nhánh 1: Khái niệm gốc",
      detail: "Bản chất cốt lõi",
      color: "b",
      x: 0,
      y: 0,
      parentId: rootId,
    },
    {
      id: b4Id,
      label: "Nhánh 4 (chẻ từ Nhánh 1)",
      detail: "Ý mở rộng / ngoại lệ",
      color: "y",
      x: 0,
      y: 0,
      parentId: b1Id,
    },
    {
      id: b2Id,
      label: "Nhánh 2: Công thức / Cơ chế",
      detail: "Áp dụng giải bài",
      color: "g",
      x: 0,
      y: 0,
      parentId: rootId,
    },
    {
      id: b3Id,
      label: "Nhánh 3: Bẫy hay sai",
      detail: "Điểm dễ mất điểm",
      color: "p",
      x: 0,
      y: 0,
      parentId: rootId,
    },
  ];

  const edges: GraphEdgeItem[] = [
    { id: `ge-${stamp}-1`, source: rootId, target: b1Id },
    { id: `ge-${stamp}-2`, source: rootId, target: b2Id },
    { id: `ge-${stamp}-3`, source: rootId, target: b3Id },
    {
      id: `ge-${stamp}-4`,
      source: b1Id,
      target: b4Id,
      label: "chẻ nhánh sâu",
    },
    {
      id: `ge-${stamp}-cross`,
      source: b4Id,
      target: b2Id,
      label: "liên kết chéo",
      dashed: true,
    },
  ];

  return {
    kind: "graph",
    layout,
    nodes: applyGraphLayout(rawNodes, edges, layout),
    edges,
  };
}
