import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = "Поиск по курсам" }: SearchBarProps) {
  return (
    <div className="relative flex items-center w-full max-w-2xl">
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 pl-4 pr-14 rounded-xl bg-card border-border/50 shadow-soft text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
      />
      <Button
        size="icon"
        className="absolute right-1.5 h-9 w-9 rounded-lg bg-primary hover:bg-purple-dark text-primary-foreground"
      >
        <Search className="w-4 h-4" />
      </Button>
    </div>
  );
}
