import { Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/layout";
import { CalendarPage } from "@/widgets/calendar";
import HomePage from "@/widgets/HomePage";
import CoursesPage from "@/widgets/CoursesPage";
import ProfilePage from "@/widgets/ProfilePage";
import SettingsPage from "@/widgets/SettingsPage";
import GlossaryPage from "@/widgets/GlossaryPage";
import AuthPage from "@/app/auth/page";
import CourseManagePage from "@/widgets/CourseManagePage";
import CourseDetailPage from "@/widgets/CourseDetailPage";
import { CourseStatisticsPage } from "@/widgets/CourseStatisticsPage";
import ChapterCanvasPage from "@/widgets/ChapterCanvasPage";
import SubchapterEditPage from "@/widgets/SubchapterEditPage";
import { ProtectedRoute } from "@/shared/routing/ProtectedRoute";

export const Router = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout><HomePage /></AppLayout>} />
      <Route path="/calendar" element={<AppLayout><CalendarPage /></AppLayout>} />
      <Route path="/courses" element={<CoursesPage />} />
      <Route 
        path="/courses/create" 
        element={
          <ProtectedRoute>
            <CourseManagePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/courses/:id/manage" 
        element={
          <ProtectedRoute>
            <CourseManagePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/courses/:courseId/chapters/:chapterId/canvas" 
        element={
          <ProtectedRoute>
            <ChapterCanvasPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/courses/:courseId/chapters/:chapterId/subchapters" 
        element={
          <ProtectedRoute>
            <SubchapterEditPage />
          </ProtectedRoute>
        } 
      />
      <Route path="/courses/:id/statistics" element={<AppLayout><CourseStatisticsPage /></AppLayout>} />
      <Route path="/courses/:id" element={<CourseDetailPage />} />
      <Route path="/profile" element={<AppLayout><ProfilePage /></AppLayout>} />
      <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
      <Route path="/glossary" element={<AppLayout><GlossaryPage /></AppLayout>} />
      <Route path="/auth" element={<AppLayout><AuthPage /></AppLayout>} />
    </Routes>
  );
};
