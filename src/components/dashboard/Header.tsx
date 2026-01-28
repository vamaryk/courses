import { Bell, ChevronDown } from "lucide-react";

const Header = () => {
  return (
    <header className="flex items-center justify-between mb-6">
      <div className="text-xl font-bold text-foreground">LOGO</div>
      
      <div className="flex items-center gap-4">
        <button className="relative p-2 hover:bg-muted rounded-full transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        </button>
        
        <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500" />
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </header>
  );
};

export default Header;
