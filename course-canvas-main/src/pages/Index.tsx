import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import CoverUpload from "@/components/dashboard/CoverUpload";
import CourseHeaderCard from "@/components/dashboard/CourseHeaderCard";
import CategorizationCard from "@/components/dashboard/CategorizationCard";
import ChaptersCard from "@/components/dashboard/ChaptersCard";
import OutcomesCard from "@/components/dashboard/OutcomesCard";
import FooterActions from "@/components/dashboard/FooterActions";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="ml-16">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="max-w-7xl mx-auto px-8 pb-12">
          {/* Cover Upload Section */}
          <CoverUpload />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Left Column */}
            <div className="space-y-6">
              <CourseHeaderCard />
              <ChaptersCard />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <CategorizationCard />
              <OutcomesCard />
            </div>
          </div>

          {/* Footer Actions */}
          <FooterActions />
        </main>
      </div>
    </div>
  );
};

export default Index;
