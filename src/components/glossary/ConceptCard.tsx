import { motion } from "framer-motion";
import type { ConceptNode } from "@/types/glossary";
import { Pencil, Trash2, GripVertical } from "lucide-react";

interface ConceptCardProps {
  node: ConceptNode;
  isActiveStage: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  onEdit: (node: ConceptNode) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string, e: React.MouseEvent) => void;
}

const ConceptCard = ({
  node,
  isActiveStage,
  isHighlighted,
  isDimmed,
  onEdit,
  onDelete,
  onDragStart,
}: ConceptCardProps) => {
  return (
    <motion.div
      data-node-id={node.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: isDimmed ? 0.35 : 1,
        scale: 1,
        filter: !isActiveStage && !isHighlighted ? "blur(var(--stage-blur))" : "blur(0px)",
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="absolute w-[220px] group"
      style={{ left: node.x, top: node.y }}
    >
      <div
        className={`
          relative rounded-2xl border-2 bg-card p-4 shadow-sm transition-all duration-300
          ${isHighlighted ? "border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/30" : "border-border"}
          ${isActiveStage ? "hover:shadow-md hover:border-primary/50" : ""}
        `}
      >
        <div
          onMouseDown={(e) => onDragStart(node.id, e)}
          className="absolute -top-1 left-1/2 -translate-x-1/2 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold shadow">
          {node.stage}
        </span>

        <h3 className="text-sm font-semibold text-foreground mb-1 pr-6">{node.title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{node.description}</p>

        <div className="flex flex-wrap gap-1 mt-2">
          {node.themes.map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              {t}
            </span>
          ))}
        </div>

        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(node)}
            className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={() => onDelete(node.id)}
            className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ConceptCard;

