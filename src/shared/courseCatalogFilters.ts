import {
  BookOpen,
  Palette,
  Megaphone,
  Briefcase,
  Database,
  MessageSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type CategoryDirection = {
  id: string;
  label: string;
  icon: LucideIcon;
  keywords: string[];
  subcategories?: string[];
  gradient: string;
  hoverGradient: string;
};

/** Направления и подкатегории — как на главной (секция «Курсы»). */
export const COURSE_DIRECTION_CATEGORIES: CategoryDirection[] = [
  {
    id: "development",
    label: "Разработка",
    icon: BookOpen,
    keywords: [
      "разработка",
      "программирование",
      "код",
      "javascript",
      "python",
      "react",
      "go",
      "php",
    ],
    subcategories: ["JavaScript", "Python", "React", "Go", "PHP"],
    gradient: "from-violet-500 to-purple-600",
    hoverGradient: "from-purple-600 to-violet-700",
  },
  {
    id: "design",
    label: "Дизайн",
    icon: Palette,
    keywords: ["дизайн", "ui", "ux", "figma"],
    subcategories: [],
    gradient: "from-pink-500 to-rose-600",
    hoverGradient: "from-rose-600 to-pink-700",
  },
  {
    id: "marketing",
    label: "Маркетинг",
    icon: Megaphone,
    keywords: ["маркетинг", "seo", "smm", "реклама"],
    subcategories: [],
    gradient: "from-amber-500 to-orange-600",
    hoverGradient: "from-orange-600 to-amber-700",
  },
  {
    id: "business",
    label: "Бизнес",
    icon: Briefcase,
    keywords: ["бизнес", "менеджмент", "стартап"],
    subcategories: [],
    gradient: "from-emerald-500 to-teal-600",
    hoverGradient: "from-teal-600 to-emerald-700",
  },
  {
    id: "data_science",
    label: "Data Science",
    icon: Database,
    keywords: ["данные", "аналитика", "data science", "ai", "ml"],
    subcategories: [],
    gradient: "from-cyan-500 to-blue-600",
    hoverGradient: "from-blue-600 to-cyan-700",
  },
  {
    id: "soft_skills",
    label: "Soft Skills",
    icon: MessageSquare,
    keywords: ["soft skills", "общение", "лидерство"],
    subcategories: [],
    gradient: "from-fuchsia-500 to-indigo-600",
    hoverGradient: "from-indigo-600 to-fuchsia-700",
  },
];

export const DURATION_MIN = 0;
export const DURATION_MAX_DEFAULT = 100;

export const roundPriceToTenThousand = (price: number): number => {
  return Math.ceil(price / 1000) * 1000;
};

/**
 * Та же логика направлений, что на главной: подкатегории (технологии) и ключевые слова по разделам.
 */
export function matchesDirectionFilters(
  courseTitleLower: string,
  courseDescLower: string,
  selectedCategories: string[],
  selectedSubcategories: string[],
  categories: CategoryDirection[] = COURSE_DIRECTION_CATEGORIES,
): boolean {
  let matchesCategory = true;
  if (selectedCategories.length > 0 || selectedSubcategories.length > 0) {
    matchesCategory = false;
    if (selectedSubcategories.length > 0) {
      const subKeywords = selectedSubcategories.map((s) => s.toLowerCase());
      if (
        subKeywords.some(
          (keyword) =>
            courseTitleLower.includes(keyword) ||
            courseDescLower.includes(keyword),
        )
      ) {
        matchesCategory = true;
      }
    }
    if (!matchesCategory && selectedCategories.length > 0) {
      const activeKeywords: string[] = [];
      selectedCategories.forEach((id) => {
        const category = categories.find((c) => c.id === id);
        if (category) {
          if (id === "development") {
            activeKeywords.push("разработка", "программирование", "код");
          } else {
            activeKeywords.push(...category.keywords);
          }
        }
      });
      if (
        activeKeywords.some(
          (keyword) =>
            courseTitleLower.includes(keyword) ||
            courseDescLower.includes(keyword),
        )
      ) {
        matchesCategory = true;
      }
    }
  }
  return matchesCategory;
}
