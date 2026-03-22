import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Pencil, Trash2 } from "lucide-react";
import type { ConceptNode } from "@/types/glossary";

/** Data payload stored inside a React Flow node */
export type ConceptNodeData = ConceptNode & {
  isActiveStage: boolean;
  isHighlighted: boolean;
  isSearchMatch: boolean;
  isCreator: boolean;
  onEdit: (node: ConceptNode) => void;
  onDelete: (id: string) => void;
};

export type ConceptFlowNode = Node<ConceptNodeData, "concept">;

const ConceptCard = ({ data }: NodeProps<ConceptFlowNode>) => {
  const {
    title,
    description,
    example,
    image_description,
    stage,
    themes,
    isActiveStage,
    isHighlighted,
    isSearchMatch,
    isCreator,
    onEdit,
    onDelete,
  } = data;

  const locked = !isActiveStage;

  const classList = [
    "concept-node",
    locked ? "locked" : "",
    isHighlighted ? "highlighted" : "",
    isSearchMatch ? "search-match" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classList}>
      {/* Connection handles — only for course owner */}
      {isCreator && (
        <>
          <Handle
            type="target"
            position={Position.Top}
            className="!w-3 !h-3 !bg-primary !border-2 !border-white !shadow"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            className="!w-3 !h-3 !bg-primary !border-2 !border-white !shadow"
          />
          <Handle
            type="target"
            position={Position.Left}
            id="left-target"
            className="!w-3 !h-3 !bg-primary !border-2 !border-white !shadow"
          />
          <Handle
            type="source"
            position={Position.Right}
            id="right-source"
            className="!w-3 !h-3 !bg-primary !border-2 !border-white !shadow"
          />
        </>
      )}

      <div className="concept-node-inner">
        {/* Stage badge */}
        <span className="concept-stage-badge">{stage}</span>

        {/* Edit / Delete actions — only for course owner on unlocked cards */}
        {isCreator && !locked && (
          <div className="concept-actions">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(data as ConceptNode);
              }}
              title="Редактировать"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(data.id);
              }}
              title="Удалить"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Title */}
        <h3 className="text-sm font-semibold text-foreground mb-1 pr-6 leading-tight">
          {title}
        </h3>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {description}
        </p>

        {/* Code snippet */}
        {example && (
          <div className="concept-code">{example}</div>
        )}

        {/* Image description */}
        {image_description && (
          <div className="concept-image-description">
            <p className="concept-image-label">Описание иллюстрации</p>
            <p className="concept-image-text">{image_description}</p>
          </div>
        )}

        {/* Theme tags */}
        {themes && themes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {themes.map((t) => (
              <span
                key={t}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(ConceptCard);
