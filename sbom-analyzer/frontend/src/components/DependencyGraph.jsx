import { useMemo, useCallback, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";

const SEVERITY_HEX = {
  CRITICAL: "#E23B3B",
  HIGH: "#EA7C1F",
  MEDIUM: "#D9A62A",
  LOW: "#4FA35A",
  NONE: "#5B6B84",
};

const NODE_WIDTH = 200;
const NODE_HEIGHT = 68;
const CLUSTER_GAP_X = 70;
const CLUSTER_GAP_Y = 110;
const ROOT_GAP_Y = 170;

/**
 * Large SBOM graphs fan out very wide (one application can have 30+ direct
 * dependencies). Laying the whole thing out as a single dagre tree collapses
 * into one enormous rank -- extremely tall or extremely wide, and unreadable
 * once zoomed to fit. Instead: treat each direct dependency + everything
 * transitively beneath it as its own small cluster, lay each cluster out
 * independently (small, dense, legible), then tile the clusters in a grid
 * with the application root centered above them. This keeps every on-screen
 * text label roughly the same size regardless of how big the app is.
 */
function layoutGraph(nodes, edges, containerWidth) {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const rootNode = nodes.find((n) => n.data.nodeType === "root");
  const childrenMap = new Map();
  edges.forEach((e) => {
    if (!childrenMap.has(e.source)) childrenMap.set(e.source, []);
    childrenMap.get(e.source).push(e.target);
  });

  const directIds = rootNode ? childrenMap.get(rootNode.id) || [] : [];

  // Assign every non-root, non-direct node to exactly one direct-dependency
  // cluster (first parent that reaches it wins; a diamond dependency reached
  // by a second branch just gets an extra visual edge drawn to it later).
  const claimed = new Set([rootNode?.id, ...directIds]);
  const clusterMembers = new Map(directIds.map((id) => [id, [id]]));

  directIds.forEach((directId) => {
    const queue = [...(childrenMap.get(directId) || [])];
    while (queue.length) {
      const id = queue.shift();
      if (claimed.has(id)) continue;
      claimed.add(id);
      clusterMembers.get(directId).push(id);
      queue.push(...(childrenMap.get(id) || []));
    }
  });

  // Lay out each cluster independently (small, dense dagre tree).
  const clusterLayouts = directIds.map((directId) => {
    const memberIds = clusterMembers.get(directId);
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: "TB", nodesep: 22, ranksep: 56, marginx: 0, marginy: 0 });
    memberIds.forEach((id) => g.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
    edges.forEach((e) => {
      if (memberIds.includes(e.source) && memberIds.includes(e.target)) {
        g.setEdge(e.source, e.target);
      }
    });
    dagre.layout(g);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const localPositions = {};
    memberIds.forEach((id) => {
      const p = g.node(id);
      localPositions[id] = p;
      minX = Math.min(minX, p.x - NODE_WIDTH / 2);
      maxX = Math.max(maxX, p.x + NODE_WIDTH / 2);
      minY = Math.min(minY, p.y - NODE_HEIGHT / 2);
      maxY = Math.max(maxY, p.y + NODE_HEIGHT / 2);
    });

    return {
      directId,
      memberIds,
      localPositions,
      width: maxX - minX,
      height: maxY - minY,
      offsetX: minX,
      offsetY: minY,
    };
  });

  // Pack clusters left-to-right, wrapping into rows once a target row width
  // is exceeded, so the overall shape stays roughly as wide as it is tall
  // instead of stretching out in one direction.
  const targetRowWidth = Math.max(containerWidth || 1400, 900);
  const positions = {};
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;
  let rowStartX = 0;

  clusterLayouts.forEach((cl) => {
    if (cursorX > 0 && cursorX + cl.width > targetRowWidth) {
      cursorX = 0;
      cursorY += rowHeight + CLUSTER_GAP_Y;
      rowHeight = 0;
    }
    cl.memberIds.forEach((id) => {
      const p = cl.localPositions[id];
      positions[id] = {
        x: cursorX + (p.x - NODE_WIDTH / 2 - cl.offsetX),
        y: cursorY + ROOT_GAP_Y + (p.y - NODE_HEIGHT / 2 - cl.offsetY),
      };
    });
    cursorX += cl.width + CLUSTER_GAP_X;
    rowHeight = Math.max(rowHeight, cl.height);
  });

  const totalWidth = Math.max(cursorX - CLUSTER_GAP_X, NODE_WIDTH);

  if (rootNode) {
    positions[rootNode.id] = { x: totalWidth / 2 - NODE_WIDTH / 2, y: 0 };
  }

  return nodes.map((n) => ({ ...n, position: positions[n.id] || { x: 0, y: 0 } }));
}

function RiskNode({ data }) {
  const color = SEVERITY_HEX[data.severity] || SEVERITY_HEX.NONE;
  const isRoot = data.nodeType === "root";

  return (
    <div
      style={{
        width: NODE_WIDTH,
        borderColor: isRoot ? "#14B8AA" : color,
      }}
      className={`rounded-xl border-2 px-3.5 py-2.5 shadow-lg ${
        isRoot ? "bg-signal-teal/15" : "bg-ink-800"
      }`}
    >
      <Handle type="target" position={Position.Top} style={{ background: color, border: "none", width: 7, height: 7 }} />
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-base font-semibold text-slate-50 truncate">{data.label}</span>
        {!isRoot && (
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          />
        )}
      </div>
      {!isRoot && (
        <div className="mt-1 flex items-center justify-between text-sm text-slate-300 font-mono">
          <span className="truncate">{data.version}</span>
          {data.cveCount > 0 && (
            <span style={{ color }} className="font-semibold">
              {data.cveCount} CVE{data.cveCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
      {isRoot && <div className="mt-0.5 text-sm text-signal-teal font-mono font-medium">APPLICATION</div>}
      <Handle type="source" position={Position.Bottom} style={{ background: color, border: "none", width: 7, height: 7 }} />
    </div>
  );
}

const nodeTypes = { risk: RiskNode };

export default function DependencyGraph({ graphData, onNodeSelect }) {
  const [containerRef, setContainerRef] = useState(null);

  const { nodes, edges } = useMemo(() => {
    if (!graphData) return { nodes: [], edges: [] };

    const rfNodes = graphData.nodes.map((n) => ({
      id: n.id,
      type: "risk",
      data: {
        label: n.label,
        version: n.version,
        severity: n.severity,
        nodeType: n.node_type,
        cveCount: n.cve_count || 0,
        raw: n,
      },
      position: { x: 0, y: 0 },
    }));

    const rfEdges = graphData.edges.map((e, i) => ({
      id: `e-${i}`,
      source: e.source,
      target: e.target,
      animated: false,
      style: { stroke: "#3B4863", strokeWidth: 1.75 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#3B4863", width: 14, height: 14 },
    }));

    const containerWidth = containerRef?.clientWidth;
    return { nodes: layoutGraph(rfNodes, rfEdges, containerWidth), edges: rfEdges };
  }, [graphData, containerRef]);

  const handleNodeClick = useCallback(
    (_, node) => {
      onNodeSelect?.(node.data.raw);
    },
    [onNodeSelect]
  );

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-ink-500 text-base">
        No dependency graph data available.
      </div>
    );
  }

  return (
    <div className="w-full h-full" ref={setContainerRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.12, maxZoom: 1.1 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1B2436" gap={22} size={1} />
        <Controls className="!bg-ink-800 !border-ink-600 !fill-slate-200 [&>button]:!border-ink-600 [&>button]:!bg-ink-800 [&>button]:hover:!bg-ink-700" />
        <MiniMap
          pannable
          zoomable
          maskColor="rgba(7,11,20,0.75)"
          className="!bg-ink-800 !border !border-ink-600"
          nodeColor={(n) => SEVERITY_HEX[n.data?.severity] || SEVERITY_HEX.NONE}
        />
      </ReactFlow>
    </div>
  );
}
