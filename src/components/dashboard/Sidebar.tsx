import { Settings } from "lucide-react";

interface SidebarProps {
  activeItem?: string;
}

const Sidebar = ({ activeItem = "courses" }: SidebarProps) => {
  return (
    <aside className="fixed left-0 top-0 h-screen w-16 bg-sidebar flex flex-col items-center py-6 z-50">
      <div className="mb-8">
        <span className="text-sidebar-foreground font-bold text-xs tracking-wider">LOGO</span>
      </div>
      
      <div className="mt-auto">
        <button className="sidebar-icon text-sidebar-foreground/50 hover:text-sidebar-foreground">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
