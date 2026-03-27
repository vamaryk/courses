import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Edge,
  type Node,
  type NodeTypes,
  type Connection,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import ConceptCard from "@/components/glossary/ConceptCard";
import NodeDialog from "@/components/glossary/NodeDialog";
import RightSidebar from "@/components/glossary/RightSidebar";
import StageBar from "@/components/glossary/StageBar";
import type { ConceptNode, ConceptEdge } from "@/types/glossary";
import {
  fetchMindmaps,
  fetchMindmapById,
  createConcept,
  updateConcept,
  deleteConcept,
  fetchCanvasEdges,
  createCanvasEdge,
  deleteCanvasEdge,
  type MindMapSummary,
  type CanvasEdgeData,
} from "@/shared/api/gollossary";
import { coursesApi } from "@/shared/api/courses";
import { progressApi } from "@/shared/api/progress";
import "@/components/glossary/glossary-flow.css";

/* ─── React Flow custom node type registry ─── */
const nodeTypes: NodeTypes = {
  concept: ConceptCard as any,
};

/* ─── Default edge style ─── */
const defaultEdgeOptions = {
  type: "smoothstep" as const,
  animated: true,
  style: { strokeWidth: 2, stroke: "hsl(var(--primary))" },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 16,
    height: 16,
    color: "hsl(var(--primary))",
  },
};

/* ─── Auto-layout helpers ─── */
const COL_COUNT = 4;
const BASE_X = 80;
const BASE_Y = 80;
const NODE_WIDTH = 240; // Must match .concept-node width in glossary-flow.css
const COLUMN_GAP = 120;
const ROW_GAP = 64;
const DX = NODE_WIDTH + COLUMN_GAP;

function estimateWrappedLines(text: string, charsPerLine: number) {
  if (!text.trim()) return 0;
  return text
    .split("\n")
    .reduce((sum, chunk) => sum + Math.max(1, Math.ceil(chunk.length / charsPerLine)), 0);
}

function estimateNodeHeight(concept: import("@/shared/api/gollossary").GollossaryConcept) {
  // Base card body: badge/title/description/actions/paddings.
  let height = 120;

  if (concept.example?.trim()) {
    const codeLines = estimateWrappedLines(concept.example, 34);
    height += 22 + codeLines * 11;
  }

  if (concept.image_description?.trim()) {
    const imageLines = estimateWrappedLines(concept.image_description, 36);
    height += 28 + imageLines * 11;
  }

  return Math.max(height, 140);
}

function autoLayoutPositions(concepts: import("@/shared/api/gollossary").GollossaryConcept[]) {
  const rowMaxHeights: number[] = [];

  concepts.forEach((concept, index) => {
    const row = Math.floor(index / COL_COUNT);
    const h = estimateNodeHeight(concept);
    rowMaxHeights[row] = Math.max(rowMaxHeights[row] || 0, h);
  });

  const rowOffsets: number[] = [];
  let accY = BASE_Y;
  rowMaxHeights.forEach((h, row) => {
    rowOffsets[row] = accY;
    accY += h + ROW_GAP;
  });

  return concepts.map((_, index) => {
    const row = Math.floor(index / COL_COUNT);
    const col = index % COL_COUNT;
    return { x: BASE_X + col * DX, y: rowOffsets[row] ?? BASE_Y };
  });
}

function estimateConceptNodeHeight(node: Pick<ConceptNode, "example" | "image_description">) {
  // Slightly conservative estimate; real DOM measurement refines this later.
  let height = 140;
  if (node.example?.trim()) {
    const codeLines = estimateWrappedLines(node.example, 30);
    height += 26 + codeLines * 12;
  }
  if (node.image_description?.trim()) {
    const imageLines = estimateWrappedLines(node.image_description, 32);
    height += 30 + imageLines * 12;
  }
  return height;
}

function relayoutConceptNodes(
  nodes: ConceptNode[],
  getHeight: (node: ConceptNode) => number,
) {
  const sorted = [...nodes].sort(
    (a, b) => (a.conceptIndex ?? 0) - (b.conceptIndex ?? 0),
  );
  const rowMaxHeights: number[] = [];

  sorted.forEach((node, index) => {
    const row = Math.floor(index / COL_COUNT);
    rowMaxHeights[row] = Math.max(rowMaxHeights[row] || 0, getHeight(node));
  });

  const rowOffsets: number[] = [];
  let accY = BASE_Y;
  rowMaxHeights.forEach((h, row) => {
    rowOffsets[row] = accY;
    accY += h + ROW_GAP;
  });

  return sorted.map((node, index) => {
    const row = Math.floor(index / COL_COUNT);
    const col = index % COL_COUNT;
    const nextPos = { x: BASE_X + col * DX, y: rowOffsets[row] ?? BASE_Y };
    return { ...node, x: nextPos.x, y: nextPos.y };
  });
}

/** Строит ConceptNode[] и ConceptEdge[] из массива понятий MindMap. */
function buildGraphFromConcepts(
  concepts: import("@/shared/api/gollossary").GollossaryConcept[],
  mindmapId: string,
  stage: number,
  course: string,
): { nodes: ConceptNode[]; edges: ConceptEdge[] } {
  const positions = autoLayoutPositions(concepts);
  const nodes: ConceptNode[] = concepts.map((c, index) => {
    const pos = positions[index];
    return {
      id: c._id || `${mindmapId}-${index}`,
      title: c.term,
      description: c.definition,
      example: c.example,
      image_description: c.image_description,
      stage,
      course,
      themes: [],
      x: pos.x,
      y: pos.y,
      conceptIndex: index,
      mindmapId,
    };
  });

  const termToId = new Map<string, string>();
  nodes.forEach((n) => termToId.set(n.title.trim().toLowerCase(), n.id));

  const edges: ConceptEdge[] = [];
  const edgeSet = new Set<string>();

  concepts.forEach((c) => {
    const selfId = termToId.get(c.term.trim().toLowerCase());
    const children = c.relations?.children || [];

    children.forEach((childName) => {
      const childId = termToId.get(childName.trim().toLowerCase());
      if (selfId && childId && selfId !== childId) {
        const key = `${selfId}->${childId}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ id: key, from: selfId, to: childId });
        }
      }
    });

    const parentName = c.relations?.parent?.trim().toLowerCase();
    if (parentName && selfId) {
      const parentId = termToId.get(parentName);
      if (parentId && parentId !== selfId) {
        const key = `${parentId}->${selfId}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ id: key, from: parentId, to: selfId });
        }
      }
    }
  });

  return { nodes, edges };
}

type UserCourseItem = { id: number; title: string };
type CourseLectureMap = {
  orderedSubchapterIds: number[];
  subchapterSet: Set<number>;
};

// source_lecture_id is now part of MindMapSummary — no need for a separate type
type MindMapMeta = MindMapSummary;

/* ═══════════════════════════════════════════════════
   GlossaryPage — Main Widget
   ═══════════════════════════════════════════════════ */
const GlossaryPage = () => {
  /* ─── State ─── */
  const API_URL = import.meta.env.VITE_API_URL || "";
  const [allMindmaps, setAllMindmaps] = useState<MindMapMeta[]>([]);
  const [activeStage, setActiveStage] = useState(1);
  const [currentCourse, setCurrentCourse] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // CRUD dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<ConceptNode | null>(null);

  // React Flow nodes & edges
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Raw concept data from API (for rebuild)
  const [rawNodes, setRawNodes] = useState<ConceptNode[]>([]);
  const [rawEdges, setRawEdges] = useState<ConceptEdge[]>([]);
  // Manual edges saved to canvas API (separate from concept-relation edges)
  const [canvasEdges, setCanvasEdges] = useState<CanvasEdgeData[]>([]);
  const [activeLectureUnlocked, setActiveLectureUnlocked] = useState(true);
  const [userCourses, setUserCourses] = useState<UserCourseItem[]>([]);
  const [courseLectureMap, setCourseLectureMap] = useState<
    Record<number, CourseLectureMap>
  >({});
  const [completedLectureIds, setCompletedLectureIds] = useState<Set<number>>(
    new Set(),
  );
  const [isCourseOwner, setIsCourseOwner] = useState(false);
  const [isCreatingMindmap, setIsCreatingMindmap] = useState(false);
  // Прогресс генерации: сколько задач running/pending из отправленных
  const [jobsStatus, setJobsStatus] = useState<{
    total: number;
    done: number;
    failed: number;
  } | null>(null);
  const jobPollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [mindmapsReloadTick, setMindmapsReloadTick] = useState(0);

  const filteredMindmaps = useMemo(() => {
    if (!currentCourse) return allMindmaps;
    const courseId = Number(currentCourse);
    const mapping = courseLectureMap[courseId];
    if (!mapping) return [];

    const mapped = allMindmaps.filter((mm) => {
      const sourceId = Number(mm.source_lecture_id);
      return Number.isFinite(sourceId) && mapping.subchapterSet.has(sourceId);
    });
    // Порядок стадий = порядок подглав в курсе (а не порядок из Mongo).
    const order = mapping.orderedSubchapterIds;
    const rank = (sid: number) => {
      const i = order.indexOf(sid);
      return i === -1 ? order.length + sid : i;
    };
    return [...mapped].sort((a, b) => {
      const sa = Number(a.source_lecture_id);
      const sb = Number(b.source_lecture_id);
      if (!Number.isFinite(sa) || !Number.isFinite(sb)) return 0;
      return rank(sa) - rank(sb);
    });
  }, [allMindmaps, currentCourse, courseLectureMap]);

  /* ─── Derived ─── */
  const activeMindmapId = useMemo(
    () => filteredMindmaps[activeStage - 1]?._id ?? null,
    [filteredMindmaps, activeStage],
  );

  const stages = useMemo(
    () =>
      filteredMindmaps.length ? filteredMindmaps.map((_, idx) => idx + 1) : [],
    [filteredMindmaps],
  );

  const lectureNames = useMemo(() => {
    const mapping: Record<number, string> = {};
    filteredMindmaps.forEach((mm, index) => {
      const num = index + 1;
      mapping[num] = mm.topic || mm.lecture_number || `Лекция ${num}`;
    });
    return mapping;
  }, [filteredMindmaps]);

  const unlockedStages = useMemo(() => {
    if (!currentCourse) {
      return new Set(stages);
    }
    const courseId = Number(currentCourse);
    const mapping = courseLectureMap[courseId];
    if (!mapping) return new Set<number>();

    const set = new Set<number>();
    let firstLocked = false;
    filteredMindmaps.forEach((mm, idx) => {
      const sourceId = Number(mm.source_lecture_id);
      const isCompleted = Number.isFinite(sourceId)
        ? completedLectureIds.has(sourceId)
        : false;
      if (!firstLocked || isCompleted) {
        set.add(idx + 1);
      }
      if (!isCompleted && !firstLocked) {
        firstLocked = true;
      }
    });
    return set;
  }, [
    currentCourse,
    stages,
    courseLectureMap,
    filteredMindmaps,
    completedLectureIds,
  ]);

  const courseProgress = useMemo(() => {
    if (!filteredMindmaps.length) {
      return { completed: 0, total: 0, percent: 0 };
    }
    if (!currentCourse) {
      return { completed: filteredMindmaps.length, total: filteredMindmaps.length, percent: 100 };
    }

    const completed = filteredMindmaps.reduce((acc, mm) => {
      const sourceId = Number(mm.source_lecture_id);
      if (Number.isFinite(sourceId) && completedLectureIds.has(sourceId)) {
        return acc + 1;
      }
      return acc;
    }, 0);
    const total = filteredMindmaps.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percent };
  }, [filteredMindmaps, currentCourse, completedLectureIds]);

  const searchLower = searchQuery.trim().toLowerCase();

  /* ─── Load mindmap list ─── */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // source_lecture_id теперь включён в MindMapSummary — не нужно делать N лишних запросов.
        const data = await fetchMindmaps();
        if (cancelled) return;
        // Дедупликация по source_lecture_id: при повторной генерации оставляем лучший mindmap.
        // Приоритет: сначала те у кого есть понятия (concept_count > 0), затем по дате (новейший).
        const sorted = [...data].sort((a, b) => {
          const ca = a.concept_count ?? 0;
          const cb = b.concept_count ?? 0;
          if (ca > 0 && cb === 0) return -1;
          if (ca === 0 && cb > 0) return 1;
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        });
        const map = new Map<string, MindMapMeta>();
        for (const mm of sorted) {
          const key = mm.source_lecture_id
            ? `src:${String(mm.source_lecture_id)}`
            : `id:${mm._id}`;
          if (!map.has(key)) map.set(key, mm);
        }
        setAllMindmaps([...map.values()]);
        if (data.length > 0) setActiveStage(1);
      } catch (e: any) {
        if (cancelled) return;
        console.error("Failed to load mindmaps", e);
        setError("Не удалось загрузить карту знаний");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [mindmapsReloadTick]);

  /* ─── Owner state for selected course ─── */
  useEffect(() => {
    let cancelled = false;
    const loadOwner = async () => {
      if (!currentCourse) {
        if (!cancelled) setIsCourseOwner(false);
        return;
      }
      const courseId = Number(currentCourse);
      if (!Number.isFinite(courseId)) {
        if (!cancelled) setIsCourseOwner(false);
        return;
      }

      try {
        const status = await coursesApi.getCourseAccessStatus(courseId);
        if (!cancelled) setIsCourseOwner(Boolean(status?.isAuthor));
      } catch {
        if (!cancelled) setIsCourseOwner(false);
      }
    };

    void loadOwner();
    return () => {
      cancelled = true;
    };
  }, [currentCourse]);

  /* ─── Load user courses + lecture ids + progress ─── */
  useEffect(() => {
    let cancelled = false;
    const loadCoursesAndProgress = async () => {
      try {
        const [ownRes, enrolledRes] = await Promise.allSettled([
          coursesApi.getMyCourses(),
          fetch(`${import.meta.env.VITE_API_URL || ""}/api/users/profile/courses`, {
            credentials: "include",
          }).then((r) => (r.ok ? r.json() : [])),
        ]);

        const ownCourses =
          ownRes.status === "fulfilled" && Array.isArray(ownRes.value)
            ? ownRes.value
            : [];

        const enrolledCourses =
          enrolledRes.status === "fulfilled" && Array.isArray(enrolledRes.value)
            ? enrolledRes.value
            : [];

        // Только "мои" (авторские) + "enrolled", без "всех" курсов.
        const courseMap = new Map<number, UserCourseItem>();
        [...enrolledCourses, ...ownCourses].forEach((c: any) => {
          const id = Number(c.id);
          if (!Number.isFinite(id)) return;
          if (!courseMap.has(id)) {
            courseMap.set(id, { id, title: c.title || `Курс ${id}` });
          }
        });

        const courseItems = Array.from(courseMap.values());
        const lectureMap: Record<number, CourseLectureMap> = {};
        const completedSet = new Set<number>();

        await Promise.all(
          courseItems.map(async (course) => {
            try {
              const full = await coursesApi.getCourse(course.id);
              const orderedSubchapterIds = (full.chapters || [])
                .slice()
                .sort((a, b) => a.order - b.order)
                .flatMap((ch) =>
                  (ch.subchapters || [])
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((s) => s.id),
                );

              lectureMap[course.id] = {
                orderedSubchapterIds,
                subchapterSet: new Set(orderedSubchapterIds),
              };

              const progress = await progressApi.getCourseProgress(course.id);
              (progress.progress || []).forEach((p) => {
                if (p.is_completed && p.subchapter_id) {
                  completedSet.add(p.subchapter_id);
                }
              });
            } catch (e) {
              console.error(
                `Failed to load course/progress for glossary course ${course.id}`,
                e,
              );
              lectureMap[course.id] = {
                orderedSubchapterIds: [],
                subchapterSet: new Set<number>(),
              };
            }
          }),
        );

        if (cancelled) return;
        setUserCourses(courseItems);
        if (courseItems.length > 0) {
          setCurrentCourse(String(courseItems[0].id));
        }
        setCourseLectureMap(lectureMap);
        setCompletedLectureIds(completedSet);
      } catch (e) {
        console.error("Failed to load courses/progress for glossary", e);
      }
    };

    loadCoursesAndProgress();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeStage > stages.length) {
      setActiveStage(1);
    }
  }, [activeStage, stages.length]);

  /* ─── Sync activeLectureUnlocked whenever stage or unlocked set changes ─── */
  useEffect(() => {
    setActiveLectureUnlocked(unlockedStages.has(activeStage));
  }, [unlockedStages, activeStage]);

  /* ─── Load active mindmap concepts + canvas edges ─── */
  useEffect(() => {
    let cancelled = false;
    const loadMindmap = async (mindmapId: string) => {
      try {
        const [mm, savedEdges] = await Promise.all([
          fetchMindmapById(mindmapId),
          fetchCanvasEdges(mindmapId),
        ]);
        if (cancelled) return;

        const { nodes, edges } = buildGraphFromConcepts(
          mm.concepts || [],
          mindmapId,
          activeStage,
          currentCourse,
        );
        setRawNodes(nodes);
        setRawEdges(edges);
        setCanvasEdges(savedEdges);
      } catch (e) {
        console.error("Failed to load mindmap details", e);
        setRawNodes([]);
        setRawEdges([]);
        setCanvasEdges([]);
      }
    };

    if (activeMindmapId) {
      loadMindmap(activeMindmapId);
    } else {
      setRawNodes([]);
      setRawEdges([]);
      setCanvasEdges([]);
    }

    return () => {
      cancelled = true;
    };
  }, [activeMindmapId, activeStage, currentCourse]);

  // After first render, measure real node heights and recalculate row spacing.
  // This prevents collisions for very long cards where text expansion beats heuristics.
  useEffect(() => {
    if (!activeMindmapId || rawNodes.length === 0) return;

    const rafId = window.requestAnimationFrame(() => {
      const measuredHeights = new Map<string, number>();

      rawNodes.forEach((node) => {
        const el = document.querySelector<HTMLElement>(
          `.react-flow__node[data-id="${node.id}"]`,
        );
        if (!el) return;
        measuredHeights.set(node.id, Math.ceil(el.getBoundingClientRect().height));
      });

      // Wait for a fuller render if not enough nodes are measurable yet.
      if (measuredHeights.size < Math.max(1, Math.floor(rawNodes.length * 0.8))) return;

      const relayouted = relayoutConceptNodes(
        rawNodes,
        (node) => measuredHeights.get(node.id) ?? estimateConceptNodeHeight(node),
      );

      const hasPositionChanges = relayouted.some((nextNode) => {
        const prevNode = rawNodes.find((n) => n.id === nextNode.id);
        return !prevNode || prevNode.x !== nextNode.x || prevNode.y !== nextNode.y;
      });

      if (hasPositionChanges) {
        setRawNodes(relayouted);
      }
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [activeMindmapId, rawNodes, setRawNodes]);

  /* ─── CRUD callbacks (stable refs) ─── */
  const handleEdit = useCallback((node: ConceptNode) => {
    setEditingNode(node);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      const node = rawNodes.find((n) => n.id === id);
      if (!node?.mindmapId || node.conceptIndex == null) return;

      try {
        await deleteConcept(node.mindmapId, node.conceptIndex);
        const mm = await fetchMindmapById(node.mindmapId);
        const { nodes, edges } = buildGraphFromConcepts(
          mm.concepts || [],
          node.mindmapId,
          activeStage,
          currentCourse,
        );
        setRawNodes(nodes);
        setRawEdges(edges);
      } catch (e) {
        console.error("Failed to delete concept", e);
      }
    },
    [rawNodes, activeStage, currentCourse],
  );

  const handleAddNode = useCallback(() => {
    setEditingNode(null);
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(
    async (data: Omit<ConceptNode, "id" | "x" | "y"> & { id?: string }) => {
      // Edit existing
      if (data.id) {
        const node = rawNodes.find((n) => n.id === data.id);
        if (!node?.mindmapId || node.conceptIndex == null) return;
        try {
          await updateConcept(node.mindmapId, node.conceptIndex, {
            term: data.title,
            definition: data.description,
            example: data.example,
          });
          const mm = await fetchMindmapById(node.mindmapId);
          const { nodes, edges } = buildGraphFromConcepts(
            mm.concepts || [],
            node.mindmapId,
            activeStage,
            currentCourse,
          );
          setRawNodes(nodes);
          setRawEdges(edges);
        } catch (e) {
          console.error("Failed to update concept", e);
        }
        return;
      }

      // Create new via API
      if (!activeMindmapId) return;
      try {
        await createConcept(activeMindmapId, {
          term: data.title,
          definition: data.description,
          example: data.example,
        });
        const mm = await fetchMindmapById(activeMindmapId);
        const { nodes, edges } = buildGraphFromConcepts(
          mm.concepts || [],
          activeMindmapId,
          activeStage,
          currentCourse,
        );
        setRawNodes(nodes);
        setRawEdges(edges);
      } catch (e) {
        console.error("Failed to create concept", e);
      }
    },
    [activeMindmapId, rawNodes, activeStage, currentCourse],
  );

  /* ─── Edge connect: создатель соединяет два блока ─── */
  const handleConnect = useCallback(
    async (connection: Connection) => {
      if (!isCourseOwner || !activeMindmapId) return;
      const { source, target } = connection;
      if (!source || !target || source === target) return;

      // Prevent duplicate canvas edges
      const duplicate = canvasEdges.some(
        (e) => e.from === source && e.to === target,
      );
      if (duplicate) return;

      try {
        const result = await createCanvasEdge(activeMindmapId, source, target);
        setCanvasEdges(result.edges ?? []);
      } catch (e) {
        console.error("Failed to create canvas edge", e);
      }
    },
    [isCourseOwner, activeMindmapId, canvasEdges],
  );

  /* ─── Edge delete: создатель удаляет вручную созданные рёбра ─── */
  const handleEdgesDelete = useCallback(
    async (deletedEdges: Edge[]) => {
      if (!isCourseOwner || !activeMindmapId) return;
      for (const edge of deletedEdges) {
        // Only delete from canvas API if it's a canvas edge (UUID format)
        const canvasEdge = canvasEdges.find((e) => e.id === edge.id);
        if (!canvasEdge) continue;
        try {
          const result = await deleteCanvasEdge(activeMindmapId, edge.id);
          setCanvasEdges(result.edges ?? []);
        } catch (e) {
          console.error("Failed to delete canvas edge", e);
        }
      }
    },
    [isCourseOwner, activeMindmapId, canvasEdges],
  );

  /* ─── Rebuild React Flow nodes/edges whenever raw data or filters change ─── */
  useEffect(() => {
    const flowNodes = rawNodes.map((node) => {
      const isActiveStage = activeLectureUnlocked && unlockedStages.has(node.stage);
      const isSearchMatch =
        searchLower.length > 0 &&
        (node.title.toLowerCase().includes(searchLower) ||
          node.description.toLowerCase().includes(searchLower));

      return {
        id: node.id,
        type: "concept" as const,
        position: { x: node.x, y: node.y },
        data: {
          ...node,
          isActiveStage,
          isHighlighted: false,
          isSearchMatch,
          isCreator: isCourseOwner,
          onEdit: isCourseOwner ? handleEdit : undefined,
          onDelete: isCourseOwner ? handleDelete : undefined,
        } as Record<string, unknown>,
        // Только создатель может перетаскивать узлы
        draggable: isCourseOwner && isActiveStage,
      };
    });

    // Concept-relation edges (из parent/children полей)
    const relationEdges: Edge[] = rawEdges.map((e) => ({
      id: e.id,
      source: e.from,
      target: e.to,
      ...defaultEdgeOptions,
      deletable: false, // relation edges не удаляются вручную
    }));

    // Canvas edges (вручную созданные создателем)
    const canvasFlowEdges: Edge[] = canvasEdges.map((e) => ({
      id: e.id,
      source: e.from,
      target: e.to,
      ...defaultEdgeOptions,
      deletable: isCourseOwner,
      style: {
        ...defaultEdgeOptions.style,
        strokeDasharray: "6 3",
      },
    }));

    // Объединяем, исключая дубликаты по source+target
    const seen = new Set<string>();
    const allEdges: Edge[] = [];
    for (const e of [...relationEdges, ...canvasFlowEdges]) {
      const key = `${e.source}->${e.target}`;
      if (!seen.has(key)) {
        seen.add(key);
        allEdges.push(e);
      }
    }

    setRfNodes(flowNodes);
    setRfEdges(allEdges);
  }, [
    rawNodes,
    rawEdges,
    canvasEdges,
    activeLectureUnlocked,
    unlockedStages,
    activeStage,
    searchLower,
    isCourseOwner,
    handleEdit,
    handleDelete,
    setRfNodes,
    setRfEdges,
  ]);

  /* ─── Render ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">
          Загрузка карты знаний…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="max-w-md text-center space-y-3">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <p className="text-xs text-muted-foreground">
            Убедитесь, что Python-сервисы запущены:{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">python run_services.py</code>
          </p>
          <button
            onClick={() => setMindmapsReloadTick((t) => t + 1)}
            className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent transition-colors"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row bg-background overflow-hidden min-h-[calc(100vh-5rem)]">
      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 order-1">
        <StageBar
          stages={stages}
          activeStage={activeStage}
          onStageChange={setActiveStage}
          lectureNames={lectureNames}
          progressPercent={courseProgress.percent}
          completedLectures={courseProgress.completed}
        />

        {filteredMindmaps.length === 0 ? (
          <div className="flex-1 flex items-center justify-center min-h-[55vh] lg:min-h-0 p-6">
            <div className="max-w-md text-center">
              <p className="text-sm text-muted-foreground">
                Для данного курса пока нет глоссария.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Попробуйте нажать “Создать mindmap”, если вы владелец курса.
              </p>
            </div>
          </div>
        ) : (
          <div
            className="flex-1 relative min-h-[55vh] lg:min-h-0"
            style={{ minHeight: 0 }}
          >
            <div className="glossary-flow-wrapper absolute inset-0">
              <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={isCourseOwner ? handleConnect : undefined}
                onEdgesDelete={isCourseOwner ? handleEdgesDelete : undefined}
                nodeTypes={nodeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.3}
                maxZoom={2}
                proOptions={{ hideAttribution: true }}
                // Запрет взаимодействия с рёбрами для обычных пользователей
                edgesReconnectable={isCourseOwner}
                deleteKeyCode={isCourseOwner ? "Delete" : null}
                selectionKeyCode={isCourseOwner ? "Shift" : null}
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={20}
                  size={1}
                  color="hsl(var(--border))"
                />
                <Controls
                  showInteractive={false}
                  position="top-right"
                />
                <MiniMap
                  nodeStrokeWidth={3}
                  pannable
                  zoomable
                  position="bottom-left"
                  style={{ marginBottom: 60 }}
                />
              </ReactFlow>
            </div>

            {/* Floating add button — только для создателя курса */}
            {isCourseOwner && (
              <motion.button
                onClick={handleAddNode}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-colors z-50"
                title="Добавить понятие"
              >
                <Plus className="h-5 w-5" />
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* ── Right sidebar ── */}
      <div className="w-full lg:w-72 xl:w-80 shrink-0 overflow-y-auto order-2 border-t lg:border-t-0 lg:border-l border-border">
        <RightSidebar
          currentCourse={currentCourse}
          onCourseChange={setCurrentCourse}
          userCourses={userCourses}
          mindmaps={filteredMindmaps}
          activeStage={activeStage}
          onStageChange={setActiveStage}
          unlockedStages={unlockedStages}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isCourseOwner={isCourseOwner}
          isCreatingMindmap={isCreatingMindmap}
          jobsStatus={jobsStatus}
          onCreateMindmap={async () => {
            if (!currentCourse || isCreatingMindmap) return;
            const courseId = Number(currentCourse);
            if (!Number.isFinite(courseId)) return;

            // Сбрасываем предыдущий поллер, если вдруг остался
            if (jobPollerRef.current) {
              clearInterval(jobPollerRef.current);
              jobPollerRef.current = null;
            }
            setJobsStatus(null);
            setIsCreatingMindmap(true);

            try {
              const resp = await fetch(
                `${API_URL}/api/courses/${courseId}/glossary/mindmaps/generate`,
                { method: "POST", credentials: "include" },
              );

              if (!resp.ok) {
                const text = await resp.text().catch(() => "");
                throw new Error(text || `HTTP ${resp.status}`);
              }

              const data = await resp.json().catch(() => ({}));
              const totalSubchapters: number = data?.totalSubchapters ?? 1;

              // Инициализируем статус
              setJobsStatus({ total: totalSubchapters, done: 0, failed: 0 });

              const GOLLOSSARY_URL =
                (import.meta.env.VITE_GOLLOSSARY_PROCESSOR_URL as string) ||
                "http://127.0.0.1:8001";

              // Поллинг статуса задач каждые 5 с
              const pollStart = Date.now();
              const MAX_POLL_MS = 15 * 60 * 1000; // 15 минут максимум

              jobPollerRef.current = setInterval(async () => {
                try {
                  const jobsResp = await fetch(`${GOLLOSSARY_URL}/api/v1/lectures/jobs`);
                  if (!jobsResp.ok) return;
                  const jobs: Array<{
                    status: string;
                    created_at: string;
                    mindmap_id?: string | null;
                  }> = await jobsResp.json();

                  // Берём задачи, запущенные не раньше, чем 30 с назад (наши)
                  const cutoff = new Date(Date.now() - 30_000).toISOString();
                  const ourJobs = jobs.filter((j) => j.created_at >= cutoff);
                  if (ourJobs.length === 0) return;

                  const done = ourJobs.filter((j) => j.status === "done").length;
                  const failed = ourJobs.filter((j) => j.status === "failed").length;
                  const finished = done + failed;

                  setJobsStatus({ total: Math.max(totalSubchapters, ourJobs.length), done, failed });

                  // Перезагружаем mindmaps когда появляются результаты
                  if (done > 0) {
                    setMindmapsReloadTick((t) => t + 1);
                  }

                  // Останавливаем поллер если всё готово или таймаут
                  const allDone = finished >= totalSubchapters || finished >= ourJobs.length;
                  const timedOut = Date.now() - pollStart > MAX_POLL_MS;

                  if (allDone || timedOut) {
                    if (jobPollerRef.current) {
                      clearInterval(jobPollerRef.current);
                      jobPollerRef.current = null;
                    }
                    setIsCreatingMindmap(false);
                    setMindmapsReloadTick((t) => t + 1);
                  }
                } catch {
                  // Игнорируем ошибки поллинга
                }
              }, 5000);

            } catch (e) {
              console.error("Failed to generate mindmaps:", e);
              setIsCreatingMindmap(false);
            }
          }}
        />
      </div>

      {/* ── CRUD Dialog — только для создателя курса ── */}
      {isCourseOwner && (
        <NodeDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={handleSave}
          editNode={editingNode}
          currentCourse={currentCourse}
          lectureNames={lectureNames}
        />
      )}
    </div>
  );
};

export default GlossaryPage;
