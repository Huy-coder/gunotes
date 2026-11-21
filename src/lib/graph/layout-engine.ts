import type {
  GraphEdgeItem,
  GraphLayoutMode,
  GraphNodeItem,
} from "@/types/study";

interface TreeChildMap {
  roots: string[];
  childrenOf: Map<string, string[]>;
}

/**
 * Builds a cycle-safe spanning forest from graph nodes & edges.
 * Ignores dashed cross-link edges so hierarchy layouts never loop.
 */
function buildSpanningForest(
  nodes: GraphNodeItem[],
  edges: GraphEdgeItem[]
): TreeChildMap {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const rawAdj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const n of nodes) {
    rawAdj.set(n.id, []);
    inDegree.set(n.id, 0);
  }

  for (const edge of edges) {
    if (edge.dashed) continue;
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    rawAdj.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  // Also respect explicit parentId if no tree edge points to node
  for (const n of nodes) {
    if (n.parentId && nodeIds.has(n.parentId)) {
      const list = rawAdj.get(n.parentId) ?? [];
      if (!list.includes(n.id)) {
        list.push(n.id);
        rawAdj.set(n.parentId, list);
        inDegree.set(n.id, (inDegree.get(n.id) ?? 0) + 1);
      }
    }
  }

  const explicitRoot = nodes.find((n) => n.isRoot);
  const candidateRoots: string[] = [];
  if (explicitRoot) candidateRoots.push(explicitRoot.id);
  for (const n of nodes) {
    if ((inDegree.get(n.id) ?? 0) === 0 && !candidateRoots.includes(n.id)) {
      candidateRoots.push(n.id);
    }
  }
  for (const n of nodes) {
    if (!candidateRoots.includes(n.id)) {
      candidateRoots.push(n.id);
    }
  }

  const visited = new Set<string>();
  const childrenOf = new Map<string, string[]>();
  const roots: string[] = [];

  for (const n of nodes) childrenOf.set(n.id, []);

  const dfs = (id: string) => {
    const neighbors = rawAdj.get(id) ?? [];
    for (const nextId of neighbors) {
      if (!visited.has(nextId)) {
        visited.add(nextId);
        childrenOf.get(id)?.push(nextId);
        dfs(nextId);
      }
    }
  };

  for (const candidate of candidateRoots) {
    if (!visited.has(candidate)) {
      visited.add(candidate);
      roots.push(candidate);
      dfs(candidate);
    }
  }

  return { roots, childrenOf };
}

function measureLeafWeight(
  id: string,
  childrenOf: Map<string, string[]>,
  memo: Map<string, number>
): number {
  const cached = memo.get(id);
  if (cached !== undefined) return cached;
  const kids = childrenOf.get(id) ?? [];
  if (kids.length === 0) {
    memo.set(id, 1);
    return 1;
  }
  const sum = kids.reduce(
    (acc, k) => acc + measureLeafWeight(k, childrenOf, memo),
    0
  );
  memo.set(id, sum);
  return sum;
}

/**
 * Computes clean non-overlapping node positions for any graph according to `layout`.
 */
export function applyGraphLayout(
  nodes: GraphNodeItem[],
  edges: GraphEdgeItem[],
  layout: GraphLayoutMode
): GraphNodeItem[] {
  if (nodes.length === 0) return [];

  const { roots, childrenOf } = buildSpanningForest(nodes, edges);
  const weightMemo = new Map<string, number>();
  for (const r of roots) {
    measureLeafWeight(r, childrenOf, weightMemo);
  }

  const posMap = new Map<string, { x: number; y: number }>();

  if (layout === "mindmap") {
    const dx = 325;
    const dy = 148;
    const totalLeaves = roots.reduce(
      (acc, r) => acc + (weightMemo.get(r) ?? 1),
      0
    );
    let cursorY = -((totalLeaves - 1) * dy) / 2;

    const placeHorizontal = (id: string, depth: number) => {
      const kids = childrenOf.get(id) ?? [];
      if (kids.length === 0) {
        posMap.set(id, { x: Math.round(depth * dx), y: Math.round(cursorY) });
        cursorY += dy;
        return;
      }
      const childYs: number[] = [];
      for (const kid of kids) {
        placeHorizontal(kid, depth + 1);
        childYs.push(posMap.get(kid)?.y ?? cursorY);
      }
      const minY = Math.min(...childYs);
      const maxY = Math.max(...childYs);
      posMap.set(id, {
        x: Math.round(depth * dx),
        y: Math.round((minY + maxY) / 2),
      });
    };

    for (const r of roots) {
      placeHorizontal(r, 0);
      cursorY += 42;
    }
  } else if (layout === "tree") {
    const dx = 285;
    const dy = 182;
    const totalLeaves = roots.reduce(
      (acc, r) => acc + (weightMemo.get(r) ?? 1),
      0
    );
    let cursorX = -((totalLeaves - 1) * dx) / 2;

    const placeVertical = (id: string, depth: number) => {
      const kids = childrenOf.get(id) ?? [];
      if (kids.length === 0) {
        posMap.set(id, { x: Math.round(cursorX), y: Math.round(depth * dy) });
        cursorX += dx;
        return;
      }
      const childXs: number[] = [];
      for (const kid of kids) {
        placeVertical(kid, depth + 1);
        childXs.push(posMap.get(kid)?.x ?? cursorX);
      }
      const minX = Math.min(...childXs);
      const maxX = Math.max(...childXs);
      posMap.set(id, {
        x: Math.round((minX + maxX) / 2),
        y: Math.round(depth * dy),
      });
    };

    for (const r of roots) {
      placeVertical(r, 0);
      cursorX += 46;
    }
  } else if (layout === "radial") {
    const primaryRoot = roots[0];
    const extraRoots = roots.slice(1);

    const placeRadialSector = (
      id: string,
      depth: number,
      angleStart: number,
      angleEnd: number
    ) => {
      if (depth === 0) {
        posMap.set(id, { x: 0, y: 0 });
      } else {
        const midAngle = (angleStart + angleEnd) / 2;
        const radius = depth === 1 ? 355 : 355 + (depth - 1) * 280;
        posMap.set(id, {
          x: Math.round(Math.cos(midAngle) * radius),
          y: Math.round(Math.sin(midAngle) * radius),
        });
      }

      const kids = childrenOf.get(id) ?? [];
      if (kids.length === 0) return;

      const totalWeight = kids.reduce(
        (acc, k) => acc + (weightMemo.get(k) ?? 1),
        0
      );
      let current = angleStart;
      const span = angleEnd - angleStart;
      for (const kid of kids) {
        const w = weightMemo.get(kid) ?? 1;
        const portion = span * (w / Math.max(1, totalWeight));
        placeRadialSector(kid, depth + 1, current, current + portion);
        current += portion;
      }
    };

    if (primaryRoot) {
      placeRadialSector(primaryRoot, 0, -Math.PI / 2, (3 * Math.PI) / 2);
    }
    extraRoots.forEach((extraId, idx) => {
      posMap.set(extraId, { x: 460 + idx * 290, y: 390 });
    });
  } else {
    // Flowchart: sequential BFS rows, 3 per row
    const order: string[] = [];
    const queue = [...roots];
    const seen = new Set<string>(roots);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      order.push(cur);
      for (const kid of childrenOf.get(cur) ?? []) {
        if (!seen.has(kid)) {
          seen.add(kid);
          queue.push(kid);
        }
      }
    }
    const cols = 3;
    const dx = 315;
    const dy = 175;
    order.forEach((id, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      posMap.set(id, {
        x: Math.round(col * dx),
        y: Math.round(row * dy),
      });
    });
  }

  return nodes.map((node) => {
    const nextPos = posMap.get(node.id);
    return nextPos ? { ...node, x: nextPos.x, y: nextPos.y } : node;
  });
}

/**
 * Chooses optimal source/target handle IDs ("top" | "right" | "bottom" | "left")
 * based on node relative positions and active layout direction.
 */
export function pickEdgeHandles(
  src: { x: number; y: number } | undefined,
  tgt: { x: number; y: number } | undefined,
  layout: GraphLayoutMode | "circle"
): { sourceHandle: string; targetHandle: string } {
  if (!src || !tgt) {
    return { sourceHandle: "right", targetHandle: "left" };
  }

  if (layout === "mindmap" || layout === "flowchart") {
    return tgt.x >= src.x - 20
      ? { sourceHandle: "right", targetHandle: "left" }
      : { sourceHandle: "left", targetHandle: "right" };
  }

  if (layout === "tree") {
    return tgt.y >= src.y - 20
      ? { sourceHandle: "bottom", targetHandle: "top" }
      : { sourceHandle: "top", targetHandle: "bottom" };
  }

  const dx = tgt.x - src.x;
  const dy = tgt.y - src.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceHandle: "right", targetHandle: "left" }
      : { sourceHandle: "left", targetHandle: "right" };
  }
  return dy >= 0
    ? { sourceHandle: "bottom", targetHandle: "top" }
    : { sourceHandle: "top", targetHandle: "bottom" };
}
