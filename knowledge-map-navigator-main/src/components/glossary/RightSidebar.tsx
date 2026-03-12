import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { themes } from "@/data/glossaryData";

const API_URL = import.meta.env.VITE_API_URL || "";

interface UserCourse {
  id: number;
  title: string;
}

interface RightSidebarProps {
  currentCourse: string;
  onCourseChange: (id: string) => void;
  activeTheme: string | null;
  onThemeToggle: (id: string | null) => void;
}

const RightSidebar = ({ currentCourse, onCourseChange, activeTheme, onThemeToggle }: RightSidebarProps) => {
  const [userCourses, setUserCourses] = useState<UserCourse[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loadCourses = async () => {
      try {
        const [enrolledRes, ownRes] = await Promise.all([
          fetch(`${API_URL}/api/users/profile/courses`, { credentials: "include" }),
          fetch(`${API_URL}/api/courses/my`, { credentials: "include" }),
        ]);

        const enrolled = enrolledRes.ok ? await enrolledRes.json() : [];
        const own = ownRes.ok ? await ownRes.json() : [];

        const byId = new Map<number, string>();
        enrolled.forEach((c: any) => {
          if (c.id && c.title) byId.set(c.id, c.title);
        });
        own.forEach((c: any) => {
          if (c.id && c.title) byId.set(c.id, c.title);
        });

        if (!cancelled) {
          setUserCourses(
            Array.from(byId.entries()).map(([id, title]) => ({ id, title })),
          );
        }
      } catch (e) {
        console.error("Failed to load user courses for glossary sidebar", e);
      }
    };
    loadCourses();
    return () => {
      cancelled = true;
    };
  }, []);

  // Фильтруем лекции по текущему курсу
  const courseThemes = useMemo(() => {
    const courseKey = currentCourse === "typescript" ? "ts" : currentCourse;
    return themes.filter((t) => t.id.includes(courseKey));
  }, [currentCourse]);

  return (
    <motion.aside
      initial={{ x: 60 }}
      animate={{ x: 0 }}
      className="w-56 border-l border-border bg-sidebar p-5 shrink-0 overflow-y-auto"
    >
      {/* Courses */}
      <div className="mb-8">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Курсы</h3>
        <div className="space-y-1">
          {userCourses.map((c) => (
            <button
              key={c.id}
              onClick={() => onCourseChange(String(c.id))}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                currentCourse === String(c.id)
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-foreground hover:bg-accent"
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>

      {/* Лекции */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Лекции</h3>
        <div className="space-y-1">
          {courseThemes.map((t) => (
            <button
              key={t.id}
              onClick={() => onThemeToggle(activeTheme === t.id ? null : t.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                activeTheme === t.id
                  ? "bg-accent text-accent-foreground font-medium ring-1 ring-primary/40"
                  : "text-foreground hover:bg-accent/60"
              }`}
            >
              <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: `hsl(${t.color})` }} />
              {t.name}
            </button>
          ))}
        </div>
      </div>
    </motion.aside>
  );
};

export default RightSidebar;
