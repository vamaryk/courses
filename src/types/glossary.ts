export interface ConceptNode {
  id: string;
  title: string;
  description: string;
  stage: number;
  course: string;
  themes: string[];
  x: number;
  y: number;
  /** Индекс понятия внутри MindMap в MongoDB (если загружено из БД) */
  conceptIndex?: number;
  /** ID MindMap в MongoDB, к которому относится понятие */
  mindmapId?: string;
}

export interface ConceptEdge {
  id: string;
  from: string;
  to: string;
}

export interface Course {
  id: string;
  name: string;
}

export interface Theme {
  id: string;
  name: string;
  color: string;
}

