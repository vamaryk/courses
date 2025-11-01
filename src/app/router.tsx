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

export const Router = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout><HomePage /></AppLayout>} />
      <Route path="/calendar" element={<AppLayout><CalendarPage /></AppLayout>} />
      <Route path="/courses" element={<AppLayout><CoursesPage /></AppLayout>} />
      <Route path="/courses/:id/manage" element={<AppLayout><CourseManagePage /></AppLayout>} />
      <Route path="/courses/:id/statistics" element={<AppLayout><CourseStatisticsPage /></AppLayout>} />
      <Route path="/courses/:id" element={<AppLayout><CourseDetailPage /></AppLayout>} />
      <Route path="/profile" element={<AppLayout><ProfilePage /></AppLayout>} />
      <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
      <Route path="/glossary" element={<AppLayout><GlossaryPage /></AppLayout>} />
      <Route path="/auth" element={<AppLayout showSidebar={false}><AuthPage /></AppLayout>} />
    </Routes>
  );
};
