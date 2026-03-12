import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { MindMapSummary } from "@/shared/api/gollossary";

const API_URL = import.meta.env.VITE_API_URL || "";

interface UserCourse {
  id: number;
  title: string;
}

interface RightSidebarProps {
  currentCourse: string;
  onCourseChange: (id: string) => void;
  mindmaps: MindMapSummary[];
  activeStage: number;
}

const RightSidebar = ({
  currentCourse,
  onCourseChange,
  mindmaps,
  activeStage,
}: RightSidebarProps) => {
  const [userCourses, setUserCourses] = useState<UserCourse[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loadCourses = async () => {
      try {
        const [enrolledRes, ownRes] = await Promise.all([
          fetch(`${API_URL}/api/users/profile/courses`, {
            credentials: "include",
          }),
          fetch(`${API_URL}/api/courses/my`, {
            credentials: "include",
          }),
        ]);

        const enrolled = enrolledRes.ok ? await enrolledRes.json() : [];
        const own = ownRes.ok ? await ownRes.json() : [];

        const map = new Map<number, string>();
        enrolled.forEach((c: any) => {
          if (c.id && c.title) map.set(c.id, c.title);
        });
        own.forEach((c: any) => {
          if (c.id && c.title) map.set(c.id, c.title);
        });

        if (!cancelled) {
          setUserCourses(
            Array.from(map.entries()).map(([id, title]) => ({ id, title })),
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

  const lectures = useMemo(
    () =>
      mindmaps.map((mm, index) => ({
        id: mm._id,
        index: index + 1,
        title: mm.topic || mm.lecture_number || `Лекция ${index + 1}`,
      })),
    [mindmaps],
  );

  return (
    <motion.aside
      initial={{ x: 60 }}
      animate={{ x: 0 }}
      className="w-64 shrink-0 overflow-y-auto mt-13 pr-4"
    >
      <div className="bg-white text-foreground rounded-2xl shadow-sm border border-border p-5">
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Курсы
          </h3>
          <div className="space-y-1">
            {userCourses.map((c) => (
              <button
                key={c.id}
                onClick={() => onCourseChange(String(c.id))}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  currentCourse === String(c.id)
                    ? "bg-primary/10 text-foreground font-medium border border-primary/40"
                    : "bg-gray-50 text-foreground hover:bg-gray-100"
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Лекции
          </h3>
          <div className="space-y-2">
            {lectures.map((lec) => (
              <button
                key={lec.id}
                onClick={() => {
                  const targetStage = lec.index;
                  if (targetStage !== activeStage) {
                    // Привязываем выбор лекции к StageBar через номер
                    const event = new CustomEvent("glossary:set-stage", {
                      detail: { stage: targetStage },
                    });
                    window.dispatchEvent(event);
                  }
                }}
                className={`w-full text-left px-3 py-2 rounded-full text-sm transition-all border ${
                  activeStage === lec.index
                    ? "bg-primary/10 text-foreground font-medium border-primary/50 shadow-sm"
                    : "bg-gray-50 text-foreground border-border hover:bg-gray-100"
                }`}
              >
                {lec.index}. {lec.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.aside>
  );
};

export default RightSidebar;

