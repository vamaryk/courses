import { Home, Calendar, User, Briefcase, BarChart3, Settings, Globe, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeItem?: string;
  onItemClick?: (item: string) => void;
}

const navItems = [
  { id: "home", icon: Home, label: "Главная" },
  { id: "calendar", icon: Calendar, label: "Календарь" },
  { id: "profile", icon: User, label: "Профиль" },
  { id: "portfolio", icon: Briefcase, label: "Портфолио" },
  { id: "stats", icon: BarChart3, label: "Статистика" },
  { id: "settings", icon: Settings, label: "Настройки" },
  { id: "global", icon: Globe, label: "Глобально" },
];

export function Sidebar({ activeItem = "home", onItemClick }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-20 gradient-lavender border-r border-border/30 flex flex-col items-center py-6 z-50">
      <div className="mb-8">
        <span className="text-lg font-bold text-foreground">LOGO</span>
      </div>
      
      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onItemClick?.(item.id)}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200",
                "hover:bg-sidebar-accent hover:text-primary",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-soft" 
                  : "text-muted-foreground"
              )}
              title={item.label}
            >
              <Icon className="w-5 h-5" strokeWidth={1.5} />
            </button>
          );
        })}
      </nav>

      <button
        className="w-12 h-12 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-sidebar-accent hover:text-primary transition-all duration-200"
        title="Поддержка"
      >
        <Headphones className="w-5 h-5" strokeWidth={1.5} />
      </button>
    </aside>
  );
}
