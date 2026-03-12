const GOLLOSSARY_API_URL =
  import.meta.env.VITE_GOLLOSSARY_API_URL || "http://127.0.0.1:8002";

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
  const res = await fetch(`${GOLLOSSARY_API_URL}/api/v1/mindmaps`);
  if (!res.ok) {
    throw new Error(`Failed to load mindmaps: ${res.status}`);
  }
  return res.json();
}

export async function fetchMindmapById(id: string): Promise<MindMapFull> {
  const res = await fetch(`${GOLLOSSARY_API_URL}/api/v1/mindmaps/${id}`);
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

