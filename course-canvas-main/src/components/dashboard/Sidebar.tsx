import { Home, Calendar, User, Briefcase, BarChart3, Settings, Globe, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, active: false },
  { icon: Calendar, active: false },
  { icon: User, active: true },
  { icon: Briefcase, active: false },
  { icon: BarChart3, active: false },
  { icon: Settings, active: false },
  { icon: Globe, active: false },
];

const Sidebar = () => {
  return (
    <aside className="fixed left-0 top-0 h-screen w-16 bg-sidebar flex flex-col items-center py-6 z-50">
      {/* Navigation Icons */}
      <nav className="flex flex-col items-center gap-2 flex-1 mt-8">
        {navItems.map((item, index) => (
          <button
            key={index}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:bg-sidebar-accent",
              item.active
                ? "bg-sidebar-primary-foreground/20 text-sidebar-foreground"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
            )}
          >
            <item.icon className="w-5 h-5" strokeWidth={1.5} />
          </button>
        ))}
      </nav>

      {/* Support Icon at Bottom */}
      <button className="w-10 h-10 rounded-xl flex items-center justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200">
        <Headphones className="w-5 h-5" strokeWidth={1.5} />
      </button>
    </aside>
  );
};

export default Sidebar;
