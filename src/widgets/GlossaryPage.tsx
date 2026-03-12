import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import ConceptCard from "@/components/glossary/ConceptCard";
import ConceptEdgesCanvas from "@/components/glossary/ConceptEdges";
import NodeDialog from "@/components/glossary/NodeDialog";
import RightSidebar from "@/components/glossary/RightSidebar";
import StageBar from "@/components/glossary/StageBar";
import type { ConceptNode } from "@/types/glossary";
import type { ConceptEdge } from "@/types/glossary";
import {
  fetchMindmaps,
  fetchMindmapById,
  createConcept,
  type MindMapSummary,
  type MindMapFull,
} from "@/shared/api/gollossary";

const GlossaryPage = () => {
  const [nodes, setNodes] = useState<ConceptNode[]>([]);
  const [edges, setEdges] = useState<ConceptEdge[]>([]);
  const [mindmaps, setMindmaps] = useState<MindMapSummary[]>([]);
  const [activeStage, setActiveStage] = useState(1);
  const [currentCourse, setCurrentCourse] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<ConceptNode | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffset = useRef({ dx: 0, dy: 0 });
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const activeMindmapId = useMemo(
    () => mindmaps[activeStage - 1]?._id ?? null,
    [mindmaps, activeStage],
  );

  // Загружаем список mindmap при монтировании
  useEffect(() => {
    let cancelled = false;
    const loadMindmaps = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMindmaps();
        if (cancelled) return;
        setMindmaps(data);
        if (data.length > 0) {
          setActiveStage(1);
        }
      } catch (e: any) {
        if (cancelled) return;
        console.error("Failed to load mindmaps", e);
        setError("Не удалось загрузить карту знаний");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadMindmaps();
    return () => {
      cancelled = true;
    };
  }, []);

  // При смене активной MindMap загружаем её понятия и строим узлы/рёбра
  useEffect(() => {
    let cancelled = false;
    const loadMindmap = async (mindmapId: string) => {
      try {
        const mm: MindMapFull = await fetchMindmapById(mindmapId);
        if (cancelled) return;

        const concepts = mm.concepts || [];

        // Преобразуем понятия в ConceptNode с автолейаутом
        const nodesFromConcepts: ConceptNode[] = concepts.map((c, index) => {
          const colCount = 4;
          const row = Math.floor(index / colCount);
          const col = index % colCount;
          const baseX = 160;
          const baseY = 120;
          const dx = 260;
          const dy = 200;

          return {
            id: c._id || `${mindmapId}-${index}`,
            title: c.term,
            description: c.definition,
            stage: 1,
            course: "all",
            themes: [],
            x: baseX + col * dx,
            y: baseY + row * dy,
            conceptIndex: index,
            mindmapId,
          };
        });

        // Строим рёбра по связям parent/children
        const termToId = new Map<string, string>();
        nodesFromConcepts.forEach((n) =>
          termToId.set(n.title.trim().toLowerCase(), n.id),
        );

        const edgesFromConcepts: ConceptEdge[] = [];
        const edgeSet = new Set<string>();

        concepts.forEach((c) => {
          const parentName = c.relations?.parent?.trim().toLowerCase();
          const children = c.relations?.children || [];
          const parentId = parentName ? termToId.get(parentName) : undefined;

          children.forEach((childName) => {
            const childId = termToId.get(childName.trim().toLowerCase());
            if (parentId && childId) {
              const edgeKey = `${parentId}->${childId}`;
              if (!edgeSet.has(edgeKey)) {
                edgeSet.add(edgeKey);
                edgesFromConcepts.push({
                  id: edgeKey,
                  from: parentId,
                  to: childId,
                });
              }
            }
          });
        });

        setNodes(nodesFromConcepts);
        setEdges(edgesFromConcepts);
      } catch (e) {
        console.error("Failed to load mindmap details", e);
        setNodes([]);
        setEdges([]);
      }
    };

    if (activeMindmapId) {
      loadMindmap(activeMindmapId);
    } else {
      setNodes([]);
      setEdges([]);
    }

    return () => {
      cancelled = true;
    };
  }, [activeMindmapId]);

  // Пока mindmap не привязаны жёстко к конкретным курсам,
  // отображаем все узлы независимо от выбранного курса.
  const filteredNodes = useMemo(() => nodes, [nodes]);

  const filteredEdges = useMemo(() => {
    const ids = new Set(filteredNodes.map((n) => n.id));
    return edges.filter((e) => ids.has(e.from) && ids.has(e.to));
  }, [edges, filteredNodes]);

  const stages = useMemo(
    () => (mindmaps.length ? mindmaps.map((_, idx) => idx + 1) : [1]),
    [mindmaps],
  );

  const lectureNames = useMemo(() => {
    const mapping: Record<number, string> = {};
    mindmaps.forEach((mm, index) => {
      const num = index + 1;
      mapping[num] = mm.topic || mm.lecture_number || `Лекция ${num}`;
    });
    return mapping;
  }, [mindmaps]);

  const handleSave = useCallback(
    async (data: Omit<ConceptNode, "id" | "x" | "y"> & { id?: string }) => {
      // Локальное обновление существующего узла (редактирование только в UI)
      if (data.id) {
        setNodes((prev) =>
          prev.map((n) => (n.id === data.id ? ({ ...n, ...data } as ConceptNode) : n)),
        );
        return;
      }

      // Создание нового понятия в MongoDB через gollossary
      if (!activeMindmapId) return;
      try {
        await createConcept(activeMindmapId, {
          term: data.title,
          definition: data.description,
        });
        // После успешного создания перезагружаем MindMap, чтобы получить свежий список понятий
        const mm = await fetchMindmapById(activeMindmapId);
        const concepts = mm.concepts || [];

        const colCount = 4;
        const nodesFromConcepts: ConceptNode[] = concepts.map((c, index) => {
          const row = Math.floor(index / colCount);
          const col = index % colCount;
          const baseX = 160;
          const baseY = 120;
          const dx = 260;
          const dy = 200;

          return {
            id: c._id || `${activeMindmapId}-${index}`,
            title: c.term,
            description: c.definition,
            stage: 1,
            course: "all",
            themes: [],
            x: baseX + col * dx,
            y: baseY + row * dy,
            conceptIndex: index,
            mindmapId: activeMindmapId,
          };
        });
        setNodes(nodesFromConcepts);
      } catch (e) {
        console.error("Failed to create concept in MongoDB", e);
      }
    },
    [activeMindmapId],
  );

  // Синхронизация смены стадии по событию из правого сайдбара
  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ stage: number }>;
      if (typeof custom.detail?.stage === "number") {
        setActiveStage(custom.detail.stage);
      }
    };
    window.addEventListener("glossary:set-stage", handler as EventListener);
    return () => {
      window.removeEventListener("glossary:set-stage", handler as EventListener);
    };
  }, []);

  const handleDelete = useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.from !== id && e.to !== id));
  }, []);

  const handleEdit = useCallback((node: ConceptNode) => {
    setEditingNode(node);
    setDialogOpen(true);
  }, []);

  const handleAddNode = useCallback(() => {
    setEditingNode(null);
    setDialogOpen(true);
  }, []);

  const handleDragStart = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      const node = nodes.find((n) => n.id === id);
      if (!node || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      dragOffset.current = {
        dx: e.clientX - rect.left - node.x,
        dy: e.clientY - rect.top - node.y,
      };
      setDraggingId(id);

      const onMove = (ev: MouseEvent) => {
        if (!canvasRef.current) return;
        const r = canvasRef.current.getBoundingClientRect();
        setNodes((prev) =>
          prev.map((n) =>
            n.id === id
              ? {
                  ...n,
                  x: ev.clientX - r.left - dragOffset.current.dx,
                  y: ev.clientY - r.top - dragOffset.current.dy,
                }
              : n
          )
        );
      };

      const onUp = () => {
        setDraggingId(null);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [nodes]
  );

  return (
    <div className="flex bg-background overflow-hidden min-h-[600px]">
      <div className="flex-1 flex flex-col min-w-0">
        <StageBar
          stages={stages}
          activeStage={activeStage}
          onStageChange={setActiveStage}
          lectureNames={lectureNames}
        />

        <div ref={canvasRef} className="flex-1 relative overflow-auto p-4">
          <div className="relative min-w-[1000px] min-h-[700px]">
            <ConceptEdgesCanvas edges={filteredEdges} nodes={filteredNodes} />
            <AnimatePresence>
              {filteredNodes.map((node) => {
                const isActiveStage = node.stage <= activeStage;
                const isHighlighted = false;
                const isDimmed = false;

                return (
                  <ConceptCard
                    key={node.id}
                    node={node}
                    isActiveStage={isActiveStage}
                    isHighlighted={isHighlighted}
                    isDimmed={isDimmed}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onDragStart={handleDragStart}
                  />
                );
              })}
            </AnimatePresence>
          </div>

          <motion.button
            onClick={handleAddNode}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-sidebar text-sidebar-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-colors z-10"
            title="Добавить понятие"
          >
            <Plus className="h-5 w-5" />
          </motion.button>
        </div>
      </div>

      <RightSidebar
        currentCourse={currentCourse}
        onCourseChange={setCurrentCourse}
        mindmaps={mindmaps}
        activeStage={activeStage}
      />

      <NodeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        editNode={editingNode}
        currentCourse={currentCourse}
      />
    </div>
  );
};

export default GlossaryPage;

