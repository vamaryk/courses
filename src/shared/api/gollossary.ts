const GOLLOSSARY_API_URL =
  import.meta.env.VITE_GOLLOSSARY_API_URL || "http://127.0.0.1:8002";

/** Чтение списка и карточек mindmap — через Node (сессия + фильтр по доступным лекциям). */
const LMS_API_URL = import.meta.env.VITE_API_URL || "";

export interface GollossaryConceptRelations {
  parent?: string | null;
  children?: string[];
}

export interface GollossaryConcept {
  _id?: string;
  term: string;
  definition: string;
  example?: string;
  image_description?: string;
  relations?: GollossaryConceptRelations;
}

export interface MindMapSummary {
  _id: string;
  lecture_number: string;
  topic: string;
  concept_count: number;
  created_at: string;
  source_lecture_id?: string | null;
}

export interface MindMapFull {
  _id: string;
  lecture_number: string;
  topic: string;
  description: string;
  concepts: GollossaryConcept[];
  source_lecture_id?: string | null;
  created_at: string;
  updated_at: string;
  model_used: string;
  chunk_count: number;
}

export async function fetchMindmaps(): Promise<MindMapSummary[]> {
  const res = await fetch(
    `${LMS_API_URL}/api/courses/glossary/mindmaps?limit=500`,
    { credentials: "include" },
  );
  if (!res.ok) {
    throw new Error(`Failed to load mindmaps: ${res.status}`);
  }
  return res.json();
}

export async function fetchMindmapById(id: string): Promise<MindMapFull> {
  const res = await fetch(
    `${LMS_API_URL}/api/courses/glossary/mindmaps/${encodeURIComponent(id)}`,
    { credentials: "include" },
  );
  if (!res.ok) {
    throw new Error(`Failed to load mindmap ${id}: ${res.status}`);
  }
  return res.json();
}

export interface CreateConceptPayload {
  term: string;
  definition: string;
  example?: string;
  image_description?: string;
  relations?: GollossaryConceptRelations;
}

export async function createConcept(
  mindmapId: string,
  payload: CreateConceptPayload,
): Promise<MindMapFull> {
  const res = await fetch(
    `${GOLLOSSARY_API_URL}/api/v1/mindmaps/${mindmapId}/concepts`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to create concept: ${res.status} ${res.statusText} ${text}`,
    );
  }
  return res.json();
}

export interface UpdateConceptPayload {
  term?: string;
  definition?: string;
  example?: string;
  image_description?: string;
  relations?: GollossaryConceptRelations;
}

export async function updateConcept(
  mindmapId: string,
  conceptIndex: number,
  payload: UpdateConceptPayload,
): Promise<MindMapFull> {
  const res = await fetch(
    `${GOLLOSSARY_API_URL}/api/v1/mindmaps/${mindmapId}/concepts/${conceptIndex}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to update concept: ${res.status} ${res.statusText} ${text}`,
    );
  }
  return res.json();
}

export async function deleteConcept(
  mindmapId: string,
  conceptIndex: number,
): Promise<MindMapFull> {
  const res = await fetch(
    `${GOLLOSSARY_API_URL}/api/v1/mindmaps/${mindmapId}/concepts/${conceptIndex}`,
    {
      method: "DELETE",
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to delete concept: ${res.status} ${res.statusText} ${text}`,
    );
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Canvas edges API
// ---------------------------------------------------------------------------

export interface CanvasEdgeData {
  id: string;
  from: string;
  to: string;
}

export interface CanvasData {
  nodes: unknown[];
  edges: CanvasEdgeData[];
}

export async function fetchCanvasEdges(mindmapId: string): Promise<CanvasEdgeData[]> {
  const res = await fetch(
    `${LMS_API_URL}/api/courses/glossary/mindmaps/${encodeURIComponent(mindmapId)}/canvas`,
    { credentials: "include" },
  );
  if (!res.ok) return [];
  const data: CanvasData = await res.json();
  return data.edges ?? [];
}

export async function createCanvasEdge(
  mindmapId: string,
  from: string,
  to: string,
): Promise<CanvasData> {
  const res = await fetch(
    `${GOLLOSSARY_API_URL}/api/v1/mindmaps/${mindmapId}/canvas/edges`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, to }),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to create canvas edge: ${res.status} ${text}`);
  }
  return res.json();
}

export async function deleteCanvasEdge(
  mindmapId: string,
  edgeId: string,
): Promise<CanvasData> {
  const res = await fetch(
    `${GOLLOSSARY_API_URL}/api/v1/mindmaps/${mindmapId}/canvas/edges/${edgeId}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to delete canvas edge: ${res.status} ${text}`);
  }
  return res.json();
}

