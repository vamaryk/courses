import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/layout";
import { CalendarPage } from "@/widgets/calendar";
import HomePage from "@/widgets/HomePage";
import CoursesPage from "@/widgets/CoursesPage";
import ProfilePage from "@/widgets/ProfilePage";
import SettingsPage from "@/widgets/SettingsPage";
import GlossaryPage from "@/widgets/GlossaryPage";
import AuthPage from "@/app/auth/page";
import ResetPasswordPage from "@/app/auth/reset-password";
import CourseManagePage from "@/widgets/CourseManagePage";
import CourseDetailPage from "@/pages/CourseDetailPage";
import LecturePage from "@/pages/LecturePage";
import { CourseStatisticsPage } from "@/widgets/CourseStatisticsPage";
import ChapterCanvasPage from "@/widgets/ChapterCanvasPage";
import SubchapterEditPage from "@/widgets/SubchapterEditPage";
import { ProtectedRoute } from "@/shared/routing/ProtectedRoute";

// Lazy-load: socket.io-client (~300KB) грузится только при переходе на /virtual-class
const VirtualClassPage = lazy(() => import("@/widgets/VirtualClassPage"));
const InviteAcceptPage = lazy(() => import("@/pages/InviteAcceptPage"));
const GroupInvitePage = lazy(() => import("@/pages/GroupInvitePage"));

export const Router = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout><HomePage /></AppLayout>} />
      <Route path="/calendar" element={<AppLayout><CalendarPage /></AppLayout>} />
      <Route path="/courses" element={<AppLayout><CoursesPage /></AppLayout>} />
      <Route 
        path="/courses/create" 
        element={
          <ProtectedRoute>
            <AppLayout>
              <CourseManagePage />
            </AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/courses/:id/manage" 
        element={
          <ProtectedRoute>
            <AppLayout>
              <CourseManagePage />
            </AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/courses/:courseId/chapters/:chapterId/canvas" 
        element={
          <ProtectedRoute>
            <AppLayout>
              <ChapterCanvasPage />
            </AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/courses/:courseId/chapters/:chapterId/subchapters" 
        element={
          <ProtectedRoute>
            <AppLayout>
              <SubchapterEditPage />
            </AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route path="/courses/:id/statistics" element={<AppLayout><CourseStatisticsPage /></AppLayout>} />
      <Route path="/courses/:id" element={<AppLayout><CourseDetailPage /></AppLayout>} />
      <Route path="/courses/:courseId/learn/:chapterId/:subchapterId" element={<AppLayout><LecturePage /></AppLayout>} />
      <Route path="/profile" element={<AppLayout><ProfilePage /></AppLayout>} />
      <Route path="/profile/:id" element={<AppLayout><ProfilePage /></AppLayout>} />
      <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
      <Route path="/glossary" element={<AppLayout><GlossaryPage /></AppLayout>} />
      <Route
        path="/virtual-class"
        element={
          <AppLayout>
            <Suspense fallback={<div className="flex h-64 items-center justify-center text-gray-400 text-sm">Загрузка...</div>}>
              <VirtualClassPage />
            </Suspense>
          </AppLayout>
        }
      />
      <Route
        path="/virtual-class/invite/:token"
        element={
          <AppLayout>
            <Suspense fallback={<div className="flex h-64 items-center justify-center text-gray-400 text-sm">Загрузка...</div>}>
              <InviteAcceptPage />
            </Suspense>
          </AppLayout>
        }
      />
      <Route
        path="/virtual-class/group/:token"
        element={
          <AppLayout>
            <Suspense fallback={<div className="flex h-64 items-center justify-center text-gray-400 text-sm">Загрузка...</div>}>
              <GroupInvitePage />
            </Suspense>
          </AppLayout>
        }
      />
      <Route path="/auth" element={<AppLayout><AuthPage /></AppLayout>} />
      <Route path="/auth/reset-password" element={<AppLayout><ResetPasswordPage /></AppLayout>} />
    </Routes>
  );
};
