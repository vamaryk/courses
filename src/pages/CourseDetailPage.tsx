import CourseDetailPageSt from "@/widgets/CourseDetailPageSt";
import CourseDetailPageUser from "@/widgets/CourseDetailPageUser";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { coursesApi, type CourseAccessStatus } from "@/shared/api/courses";
import { useAuth } from "@/app/providers/AuthProvider";

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isLoading: isAuthLoading } = useAuth();
  const [status, setStatus] = useState<CourseAccessStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAccessStatus = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const accessStatus = await coursesApi.getCourseAccessStatus(Number(id));
      setStatus(accessStatus);
    } catch (error) {
      console.error("Failed to fetch course access status:", error);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isAuthLoading) return;
    loadAccessStatus();
  }, [isAuthLoading, loadAccessStatus]);

  if (loading || isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const canViewStudentMode = Boolean(status?.isAuthor || status?.isEnrolled || status?.hasAccess);

  if (canViewStudentMode) {
    return <CourseDetailPageSt />;
  }

  return <CourseDetailPageUser onEnrolled={loadAccessStatus} />;
}