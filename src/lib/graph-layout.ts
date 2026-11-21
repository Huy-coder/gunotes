import type {
  DiagramData,
  GraphDiagram,
  GraphEdgeItem,
  GraphLayoutMode,
  GraphNodeItem,
  HighlightColor,
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

export function isCardNodeId(id: string): boolean {
  return id.startsWith("card:");
}

export function isCardEdgeId(id: string): boolean {
  return id.startsWith("card-edge:");
}

/**
 * Losslessly upgrades structured card diagram blocks (flowchart, tree, spider, venn)
 * into a deterministic GraphDiagram where every base element uses stable `card:` IDs.
 */
export function diagramToGraph(diagram: DiagramData): GraphDiagram {
  if (diagram.kind === "graph") return diagram;

  const nodes: GraphNodeItem[] = [];
  const edges: GraphEdgeItem[] = [];
  let layout: GraphLayoutMode = "tree";

  if (diagram.kind === "flowchart") {
    layout = "flowchart";
    const colors: HighlightColor[] = ["b", "y", "g", "p"];
    diagram.steps.forEach((step, idx) => {
      const id = `card:flow:${step.id}`;
      const prevId =
        idx > 0 ? `card:flow:${diagram.steps[idx - 1].id}` : undefined;
      nodes.push({
        id,
        label: step.label,
        detail: step.note,
        color: colors[idx % colors.length],
        x: 0,
        y: 0,
        isRoot: idx === 0,
        parentId: prevId,
      });
      if (prevId) {
        edges.push({
          id: `card-edge:flow:${diagram.steps[idx - 1].id}->${step.id}`,
          source: prevId,
          target: id,
          label: "tiếp theo",
        });
      }
    });
  } else if (diagram.kind === "tree") {
    layout = "tree";
    const rootId = "card:tree:root";
    nodes.push({
      id: rootId,
      label: diagram.root,
      detail: "Gốc chủ đề",
      color: "y",
      x: 0,
      y: 0,
      isRoot: true,
    });

    diagram.branches.forEach((br) => {
      const brId = `card:tree:br:${br.id}`;
      nodes.push({
        id: brId,
        label: br.label,
        color: br.color,
        x: 0,
        y: 0,
        parentId: rootId,
      });
      edges.push({
        id: `card-edge:tree:root->${br.id}`,
        source: rootId,
        target: brId,
      });

      br.items.forEach((item, iIdx) => {
        const itemId = `card:tree:br:${br.id}:it:${iIdx}`;
        nodes.push({
          id: itemId,
          label: item,
          color: br.color,
          x: 0,
          y: 0,
          parentId: brId,
        });
        edges.push({
          id: `card-edge:tree:${br.id}->it:${iIdx}`,
          source: brId,
          target: itemId,
        });
      });
    });
  } else if (diagram.kind === "spider") {
    layout = "radial";
    const centerId = "card:spider:center";
    nodes.push({
      id: centerId,
      label: diagram.center,
      detail: "Tâm mạng nhện",
      color: "y",
      x: 0,
      y: 0,
      isRoot: true,
    });

    diagram.nodes.forEach((sp) => {
      const id = `card:spider:node:${sp.id}`;
      nodes.push({
        id,
        label: sp.label,
        detail: sp.detail,
        color: sp.color,
        x: 0,
        y: 0,
        parentId: centerId,
      });
      edges.push({
        id: `card-edge:spider:center->${sp.id}`,
        source: centerId,
        target: id,
      });
    });
  } else if (diagram.kind === "venn") {
    layout = "tree";
    const rootId = "card:venn:root";
    nodes.push({
      id: rootId,
      label: `${diagram.leftTitle} ∩ ${diagram.rightTitle}`,
      detail: "So sánh cấu trúc",
      color: "y",
      x: 0,
      y: 0,
      isRoot: true,
    });

    const groups: Array<{
      id: string;
      slug: string;
      label: string;
      items: string[];
      color: HighlightColor;
    }> = [
      {
        id: "card:venn:left",
        slug: "left",
        label: `Riêng: ${diagram.leftTitle}`,
        items: diagram.leftOnly,
        color: "b",
      },
      {
        id: "card:venn:shared",
        slug: "shared",
        label: "Điểm chung (A ∩ B)",
        items: diagram.shared,
        color: "y",
      },
      {
        id: "card:venn:right",
        slug: "right",
        label: `Riêng: ${diagram.rightTitle}`,
        items: diagram.rightOnly,
        color: "g",
      },
    ];

    groups.forEach((grp) => {
      nodes.push({
        id: grp.id,
        label: grp.label,
        color: grp.color,
        x: 0,
        y: 0,
        parentId: rootId,
      });
      edges.push({
        id: `card-edge:venn:root->${grp.slug}`,
        source: rootId,
        target: grp.id,
      });

      grp.items.forEach((it, iIdx) => {
        const itId = `card:venn:${grp.slug}:${iIdx}`;
        nodes.push({
          id: itId,
          label: it,
          color: grp.color,
          x: 0,
          y: 0,
          parentId: grp.id,
        });
        edges.push({
          id: `card-edge:venn:${grp.slug}->${iIdx}`,
          source: grp.id,
          target: itId,
        });
      });
    });
  }

  return {
    kind: "graph",
    layout,
    nodes: applyGraphLayout(nodes, edges, layout),
    edges,
    collapsed: false,
    hasGraphEdits: false,
  };
}

function findNonOverlappingSlot(
  baseX: number,
  baseY: number,
  placed: Array<{ x: number; y: number }>
): { x: number; y: number } {
  let x = baseX;
  let y = baseY;
  for (let i = 0; i < 12; i++) {
    const collides = placed.some(
      (p) => Math.abs(p.x - x) < 95 && Math.abs(p.y - y) < 68
    );
    if (!collides) break;
    y += 120;
  }
  return { x: Math.round(x), y: Math.round(y) };
}

/**
 * Reconciles structured Card edits INTO parallel `canvasGraph` while preserving
 * all custom sub-branches, cross-links, user positions, and edge labels.
 */
export function syncCardToGraph(
  cardDiagram: DiagramData,
  existingGraph?: GraphDiagram
): GraphDiagram {
  if (cardDiagram.kind === "graph") return cardDiagram;

  const freshBase = diagramToGraph(cardDiagram);
  if (!existingGraph) return freshBase;

  // One-time migration helper if existingGraph used pre-refactor `gn-` IDs
  const hasCardNodes = existingGraph.nodes.some((n) => isCardNodeId(n.id));
  const legacyIdRemap = new Map<string, string>();
  const existingMap = new Map<string, GraphNodeItem>();

  if (hasCardNodes) {
    for (const n of existingGraph.nodes) {
      existingMap.set(n.id, n);
    }
  } else {
    const unmatchedBase = [...freshBase.nodes];
    for (const oldNode of existingGraph.nodes) {
      if (oldNode.id.startsWith("gn-")) {
        const matchIdx = unmatchedBase.findIndex(
          (fb) => fb.label.trim() === oldNode.label.trim()
        );
        if (matchIdx !== -1) {
          const [matched] = unmatchedBase.splice(matchIdx, 1);
          legacyIdRemap.set(oldNode.id, matched.id);
          existingMap.set(matched.id, oldNode);
          continue;
        }
      }
      existingMap.set(oldNode.id, oldNode);
    }
  }

  const placedPositions: Array<{ x: number; y: number }> = [];
  const reconciledBaseNodes: GraphNodeItem[] = [];

  for (const fb of freshBase.nodes) {
    const prev = existingMap.get(fb.id);
    if (prev) {
      placedPositions.push({ x: prev.x, y: prev.y });
      reconciledBaseNodes.push({
        ...fb,
        x: prev.x,
        y: prev.y,
        color: prev.color,
      });
    } else {
      const parentPos = fb.parentId
        ? reconciledBaseNodes.find((n) => n.id === fb.parentId) ??
          existingMap.get(fb.parentId)
        : undefined;
      const candX = parentPos ? parentPos.x + 310 : fb.x;
      const candY = parentPos ? parentPos.y + 90 : fb.y;
      const slot = findNonOverlappingSlot(candX, candY, placedPositions);
      placedPositions.push(slot);
      reconciledBaseNodes.push({
        ...fb,
        x: slot.x,
        y: slot.y,
      });
    }
  }

  const baseIdSet = new Set(reconciledBaseNodes.map((n) => n.id));
  const customNodesRaw = existingGraph.nodes.filter((n) => {
    if (isCardNodeId(n.id)) return false;
    if (!hasCardNodes && legacyIdRemap.has(n.id)) return false;
    return true;
  });

  const survivingIds = new Set<string>([
    ...baseIdSet,
    ...customNodesRaw.map((n) => n.id),
  ]);

  const fallbackRootId = reconciledBaseNodes[0]?.id;
  const rescueEdges: GraphEdgeItem[] = [];

  const resolveParentFallback = (deletedParentId?: string): string | undefined => {
    if (deletedParentId?.startsWith("card:tree:br:")) {
      const parts = deletedParentId.split(":");
      if (parts.length >= 4) {
        const branchId = `card:tree:br:${parts[3]}`;
        if (survivingIds.has(branchId)) return branchId;
      }
    }
    if (deletedParentId?.startsWith("card:venn:")) {
      const parts = deletedParentId.split(":");
      if (parts.length >= 3) {
        const grpId = `card:venn:${parts[2]}`;
        if (survivingIds.has(grpId)) return grpId;
      }
    }
    return fallbackRootId;
  };

  const reconciledCustomNodes: GraphNodeItem[] = customNodesRaw.map((cn) => {
    const mappedParent = cn.parentId
      ? legacyIdRemap.get(cn.parentId) ?? cn.parentId
      : undefined;

    if (mappedParent && !survivingIds.has(mappedParent)) {
      const safeParent = resolveParentFallback(mappedParent);
      if (safeParent && safeParent !== cn.id) {
        rescueEdges.push({
          id: `custom-reparent:${safeParent}->${cn.id}`,
          source: safeParent,
          target: cn.id,
        });
      }
      return {
        ...cn,
        parentId: safeParent,
      };
    }

    return mappedParent !== cn.parentId ? { ...cn, parentId: mappedParent } : cn;
  });

  const existingEdgeById = new Map(existingGraph.edges.map((e) => [e.id, e]));
  const reconciledBaseEdges: GraphEdgeItem[] = freshBase.edges.map((fe) => {
    const prevEdge = existingEdgeById.get(fe.id);
    return prevEdge
      ? {
          ...fe,
          label: prevEdge.label,
          dashed: prevEdge.dashed,
        }
      : fe;
  });

  const baseEdgeIdSet = new Set(reconciledBaseEdges.map((e) => e.id));
  const seenPairs = new Set(
    reconciledBaseEdges.map((e) => `${e.source}->${e.target}`)
  );

  const customEdges: GraphEdgeItem[] = [];
  for (const oe of existingGraph.edges) {
    if (isCardEdgeId(oe.id) || baseEdgeIdSet.has(oe.id)) continue;
    const src = legacyIdRemap.get(oe.source) ?? oe.source;
    const tgt = legacyIdRemap.get(oe.target) ?? oe.target;
    if (!hasCardNodes && baseEdgeIdSet.has(oe.id)) continue;
    if (!survivingIds.has(src) || !survivingIds.has(tgt) || src === tgt) continue;
    // Skip legacy `ge-` edge if both endpoints were remapped base nodes and a base edge exists
    if (!hasCardNodes && oe.id.startsWith("ge-") && !oe.dashed && seenPairs.has(`${src}->${tgt}`)) {
      continue;
    }
    customEdges.push({ ...oe, source: src, target: tgt });
    seenPairs.add(`${src}->${tgt}`);
  }

  for (const re of rescueEdges) {
    if (!seenPairs.has(`${re.source}->${re.target}`)) {
      customEdges.push(re);
      seenPairs.add(`${re.source}->${re.target}`);
    }
  }

  return {
    kind: "graph",
    layout: existingGraph.layout,
    nodes: [...reconciledBaseNodes, ...reconciledCustomNodes],
    edges: [...reconciledBaseEdges, ...customEdges],
    collapsed: existingGraph.collapsed,
    hasGraphEdits: existingGraph.hasGraphEdits,
  };
}

/**
 * Reverse-syncs edits to base `card:` nodes made inside Canvas back to the
 * structured Card object without ever removing `canvasGraph` custom sub-branches.
 */
export function syncGraphToCard<T extends Exclude<DiagramData, GraphDiagram>>(
  updatedGraph: GraphDiagram,
  cardDiagram: T
): T {
  const nodeMap = new Map(updatedGraph.nodes.map((n) => [n.id, n]));

  if (cardDiagram.kind === "flowchart") {
    const updatedSteps = cardDiagram.steps
      .filter((s) => nodeMap.has(`card:flow:${s.id}`))
      .map((s) => {
        const gNode = nodeMap.get(`card:flow:${s.id}`)!;
        return {
          ...s,
          label: gNode.label,
          note: gNode.detail ?? "",
        };
      });

    if (updatedSteps.length >= 2) {
      return { ...cardDiagram, steps: updatedSteps };
    }
    return {
      ...cardDiagram,
      steps: cardDiagram.steps.map((s) => {
        const gNode = nodeMap.get(`card:flow:${s.id}`);
        return gNode
          ? { ...s, label: gNode.label, note: gNode.detail ?? "" }
          : s;
      }),
    };
  }

  if (cardDiagram.kind === "tree") {
    const rootNode = nodeMap.get("card:tree:root");
    const mappedBranches = cardDiagram.branches
      .filter((br) => nodeMap.has(`card:tree:br:${br.id}`))
      .map((br) => {
        const bNode = nodeMap.get(`card:tree:br:${br.id}`)!;
        const mappedItems = br.items
          .map((it, idx) => {
            const itNode = nodeMap.get(`card:tree:br:${br.id}:it:${idx}`);
            return itNode ? itNode.label : it;
          })
          .filter((_, idx) =>
            nodeMap.has(`card:tree:br:${br.id}:it:${idx}`)
          );

        return {
          ...br,
          label: bNode.label,
          color: bNode.color,
          items: mappedItems.length > 0 ? mappedItems : br.items,
        };
      });

    return {
      ...cardDiagram,
      root: rootNode ? rootNode.label : cardDiagram.root,
      branches: mappedBranches.length > 0 ? mappedBranches : cardDiagram.branches,
    };
  }

  if (cardDiagram.kind === "spider") {
    const centerNode = nodeMap.get("card:spider:center");
    const keptNodes = cardDiagram.nodes
      .filter((sp) => nodeMap.has(`card:spider:node:${sp.id}`))
      .map((sp) => {
        const gNode = nodeMap.get(`card:spider:node:${sp.id}`)!;
        return {
          ...sp,
          label: gNode.label,
          detail: gNode.detail ?? "",
          color: gNode.color,
        };
      });

    return {
      ...cardDiagram,
      center: centerNode ? centerNode.label : cardDiagram.center,
      nodes:
        keptNodes.length >= 2
          ? keptNodes
          : cardDiagram.nodes.map((sp) => {
              const gNode = nodeMap.get(`card:spider:node:${sp.id}`);
              return gNode
                ? {
                    ...sp,
                    label: gNode.label,
                    detail: gNode.detail ?? "",
                    color: gNode.color,
                  }
                : sp;
            }),
    };
  }

  if (cardDiagram.kind === "venn") {
    const leftGrp = nodeMap.get("card:venn:left");
    const rightGrp = nodeMap.get("card:venn:right");
    const cleanTitle = (raw: string | undefined, fallback: string) => {
      if (!raw) return fallback;
      const stripped = raw.replace(/^Riêng:\s*/i, "").trim();
      return stripped || raw;
    };

    const mapBucket = (slug: string, items: string[]) => {
      const kept = items
        .map((it, idx) => {
          const n = nodeMap.get(`card:venn:${slug}:${idx}`);
          return n ? n.label : null;
        })
        .filter((x): x is string => x !== null);
      return kept.length > 0 ? kept : items;
    };

    return {
      ...cardDiagram,
      leftTitle: cleanTitle(leftGrp?.label, cardDiagram.leftTitle),
      rightTitle: cleanTitle(rightGrp?.label, cardDiagram.rightTitle),
      leftOnly: mapBucket("left", cardDiagram.leftOnly),
      shared: mapBucket("shared", cardDiagram.shared),
      rightOnly: mapBucket("right", cardDiagram.rightOnly),
    };
  }

  return cardDiagram;
}

/**
 * Summarizes custom Canvas sub-branches and cross-links attached to a Card diagram
 * so Card View can display accurate non-destructive status pills.
 */
export function getCanvasExtrasSummary(
  cardDiagram: DiagramData,
  canvasGraph?: GraphDiagram
): {
  extraNodesCount: number;
  extraCrossLinksCount: number;
  directCustomChildrenByCardId: Record<string, number>;
} {
  if (!canvasGraph || cardDiagram.kind === "graph") {
    return {
      extraNodesCount: 0,
      extraCrossLinksCount: 0,
      directCustomChildrenByCardId: {},
    };
  }

  const synced = syncCardToGraph(cardDiagram, canvasGraph);
  const nodeMap = new Map(synced.nodes.map((n) => [n.id, n]));
  const parentLookup = new Map<string, string>();
  for (const n of synced.nodes) {
    if (n.parentId && nodeMap.has(n.parentId)) parentLookup.set(n.id, n.parentId);
  }
  for (const e of synced.edges) {
    if (!e.dashed && !parentLookup.has(e.target) && nodeMap.has(e.source)) {
      parentLookup.set(e.target, e.source);
    }
  }

  const findCardAncestor = (id: string): string | undefined => {
    let cur: string | undefined = id;
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      const p = parentLookup.get(cur);
      if (!p) return undefined;
      if (isCardNodeId(p)) return p;
      cur = p;
    }
    return undefined;
  };

  let extraNodesCount = 0;
  const directCustomChildrenByCardId: Record<string, number> = {};

  for (const n of synced.nodes) {
    if (isCardNodeId(n.id)) continue;
    extraNodesCount++;
    const anc = findCardAncestor(n.id);
    if (anc) {
      directCustomChildrenByCardId[anc] =
        (directCustomChildrenByCardId[anc] ?? 0) + 1;
    }
  }

  const extraCrossLinksCount = synced.edges.filter(
    (e) => !isCardEdgeId(e.id) && e.dashed
  ).length;

  return {
    extraNodesCount,
    extraCrossLinksCount,
    directCustomChildrenByCardId,
  };
}

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
