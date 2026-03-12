import { ConceptNode, ConceptEdge, Course, Theme } from "@/types/glossary";

export const courses: Course[] = [
  { id: "react", name: "React" },
  { id: "python", name: "Python" },
  { id: "typescript", name: "TypeScript" },
];

// Темы = названия лекций
export const themes: Theme[] = [
  { id: "lec1-react", name: "Введение в React", color: "263 70% 71%" },
  { id: "lec2-react", name: "Хуки и состояние", color: "200 70% 60%" },
  { id: "lec3-react", name: "Паттерны и оптимизация", color: "150 60% 50%" },
  { id: "lec1-python", name: "Основы Python", color: "45 80% 55%" },
  { id: "lec2-python", name: "ООП в Python", color: "30 80% 60%" },
  { id: "lec3-python", name: "Продвинутый Python", color: "0 70% 60%" },
  { id: "lec1-ts", name: "Типы и интерфейсы", color: "210 70% 60%" },
  { id: "lec2-ts", name: "Generics", color: "180 60% 50%" },
  { id: "lec3-ts", name: "Utility Types", color: "330 60% 60%" },
];

// Маппинг: этап (лекция) → название лекции для каждого курса
export const lectureTitles: Record<string, Record<number, string>> = {
  react: {
    1: "Введение в React",
    2: "Хуки и состояние",
    3: "Паттерны и оптимизация",
  },
  python: {
    1: "Основы Python",
    2: "ООП в Python",
    3: "Продвинутый Python",
  },
  typescript: {
    1: "Типы и интерфейсы",
    2: "Generics",
    3: "Utility Types",
  },
};

export const initialNodes: ConceptNode[] = [
  // React — Лекция 1: Введение в React
  { id: "1", title: "Компонент", description: "Переиспользуемый блок UI, который принимает props и возвращает JSX.", stage: 1, course: "react", themes: ["lec1-react"], x: 120, y: 80 },
  { id: "2", title: "Props", description: "Входные данные компонента, переданные как атрибуты.", stage: 1, course: "react", themes: ["lec1-react"], x: 420, y: 80 },
  { id: "3", title: "JSX", description: "Синтаксическое расширение JavaScript для описания UI.", stage: 1, course: "react", themes: ["lec1-react"], x: 720, y: 80 },

  // React — Лекция 2: Хуки и состояние
  { id: "4", title: "useState", description: "Хук для управления локальным состоянием компонента.", stage: 2, course: "react", themes: ["lec2-react"], x: 120, y: 280 },
  { id: "5", title: "useEffect", description: "Хук для побочных эффектов: запросы, подписки, таймеры.", stage: 2, course: "react", themes: ["lec2-react"], x: 420, y: 280 },
  { id: "6", title: "Context API", description: "Механизм передачи данных через дерево без prop drilling.", stage: 2, course: "react", themes: ["lec2-react"], x: 720, y: 280 },

  // React — Лекция 3: Паттерны и оптимизация
  { id: "7", title: "useMemo", description: "Мемоизация вычислений для оптимизации рендера.", stage: 3, course: "react", themes: ["lec3-react"], x: 120, y: 480 },
  { id: "8", title: "HOC", description: "Higher-Order Component — функция, оборачивающая компонент.", stage: 3, course: "react", themes: ["lec3-react"], x: 420, y: 480 },
  { id: "9", title: "React Query", description: "Библиотека для кэширования серверного состояния.", stage: 3, course: "react", themes: ["lec3-react"], x: 720, y: 480 },

  // Python — Лекция 1
  { id: "p1", title: "Переменные", description: "Именованные ячейки памяти для хранения данных.", stage: 1, course: "python", themes: ["lec1-python"], x: 120, y: 80 },
  { id: "p2", title: "Функции", description: "Блоки кода, выполняющие определённую задачу.", stage: 1, course: "python", themes: ["lec1-python"], x: 420, y: 80 },
  // Python — Лекция 2
  { id: "p3", title: "Классы", description: "Шаблоны для создания объектов с атрибутами и методами.", stage: 2, course: "python", themes: ["lec2-python"], x: 270, y: 280 },
  // Python — Лекция 3
  { id: "p4", title: "Декораторы", description: "Обёртки функций для расширения поведения.", stage: 3, course: "python", themes: ["lec3-python"], x: 270, y: 480 },

  // TypeScript — Лекция 1
  { id: "t1", title: "Типы", description: "string, number, boolean — базовые типы TypeScript.", stage: 1, course: "typescript", themes: ["lec1-ts"], x: 120, y: 80 },
  { id: "t2", title: "Интерфейсы", description: "Контракт формы объекта.", stage: 1, course: "typescript", themes: ["lec1-ts"], x: 420, y: 80 },
  // TypeScript — Лекция 2
  { id: "t3", title: "Generics", description: "Параметризованные типы для переиспользуемого кода.", stage: 2, course: "typescript", themes: ["lec2-ts"], x: 270, y: 280 },
  // TypeScript — Лекция 3
  { id: "t4", title: "Utility Types", description: "Partial, Required, Pick, Omit и другие встроенные хелперы.", stage: 3, course: "typescript", themes: ["lec3-ts"], x: 270, y: 480 },
];

export const initialEdges: ConceptEdge[] = [
  { id: "e1", from: "1", to: "2" },
  { id: "e2", from: "2", to: "3" },
  { id: "e3", from: "1", to: "4" },
  { id: "e4", from: "3", to: "5" },
  { id: "e5", from: "5", to: "6" },
  { id: "e6", from: "4", to: "7" },
  { id: "e7", from: "6", to: "8" },
  { id: "e8", from: "7", to: "9" },
  { id: "ep1", from: "p1", to: "p2" },
  { id: "ep2", from: "p2", to: "p3" },
  { id: "ep3", from: "p3", to: "p4" },
  { id: "et1", from: "t1", to: "t2" },
  { id: "et2", from: "t2", to: "t3" },
  { id: "et3", from: "t3", to: "t4" },
];

