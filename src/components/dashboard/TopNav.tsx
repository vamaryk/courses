import { Bell, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TopNavProps {
  userName?: string;
}

const TopNav = ({ userName = "Сергей Сергеев" }: TopNavProps) => {
  const currentDate = new Date();
  const dayName = currentDate.toLocaleDateString('ru-RU', { weekday: 'long' });
  const dateStr = currentDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <header className="flex items-center justify-between mb-8">
      {/* Welcome Message */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">👋</span>
        <h1 className="text-2xl font-semibold text-foreground">
          С возвращением, {userName}
        </h1>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Date */}
        <div className="text-sm text-muted-foreground hidden md:block capitalize">
          {dayName} {dateStr}
        </div>

        {/* Notification Bell */}
        <button className="relative w-10 h-10 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/30 flex items-center justify-center hover:bg-white/90 transition-colors">
          <Bell className="w-5 h-5 text-foreground" />
        </button>

        {/* Profile */}
        <div className="flex items-center gap-2 cursor-pointer">
          <Avatar className="w-9 h-9">
            <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face" />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </header>
  );
};

export default TopNav;
