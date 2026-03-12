import type { ConceptEdge, ConceptNode } from "@/types/glossary";

interface ConceptEdgesProps {
  edges: ConceptEdge[];
  nodes: ConceptNode[];
}

const NODE_W = 220;
const NODE_H = 120;

function getEdgePoint(node: ConceptNode, target: ConceptNode) {
  const cx = node.x + NODE_W / 2;
  const cy = node.y + NODE_H / 2;
  const tcx = target.x + NODE_W / 2;
  const tcy = target.y + NODE_H / 2;

  const dx = tcx - cx;
  const dy = tcy - cy;

  if (Math.abs(dy) > Math.abs(dx)) {
    if (dy > 0) return { x: cx, y: node.y + NODE_H };
    return { x: cx, y: node.y };
  } else {
    if (dx > 0) return { x: node.x + NODE_W, y: cy };
    return { x: node.x, y: cy };
  }
}

const ConceptEdgesCanvas = ({ edges, nodes }: ConceptEdgesProps) => {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
          <polygon points="0 0, 10 4, 0 8" fill="hsl(var(--primary))" opacity="0.6" />
        </marker>
      </defs>
      {edges.map((edge) => {
        const fromNode = nodeMap.get(edge.from);
        const toNode = nodeMap.get(edge.to);
        if (!fromNode || !toNode) return null;

        const from = getEdgePoint(fromNode, toNode);
        const to = getEdgePoint(toNode, fromNode);

        const midX = (from.x + to.x) / 2;
        const d = `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;

        return (
          <path
            key={edge.id}
            d={d}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeOpacity="0.4"
            markerEnd="url(#arrowhead)"
            className="transition-all duration-500"
          />
        );
      })}
    </svg>
  );
};

export default ConceptEdgesCanvas;

