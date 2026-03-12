import { ChevronDown, BarChart3, Clock, FileText, Wrench } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface FilterPanelProps {
  difficulty: string;
  onDifficultyChange: (value: string) => void;
  priceRange: [number, number];
  onPriceRangeChange: (value: [number, number]) => void;
  durationRange: [number, number];
  onDurationRangeChange: (value: [number, number]) => void;
  documentTypes: string[];
  onDocumentTypesChange: (types: string[]) => void;
  skills: string[];
  onSkillsChange: (skills: string[]) => void;
}

const difficultyOptions = [
  { value: "all", label: "Все уровни" },
  { value: "beginner", label: "Для начинающих" },
  { value: "intermediate", label: "Для продолжающих" },
  { value: "pro", label: "Для профи" },
];

const documentTypeOptions = [
  { value: "diploma-vuz", label: "Диплом ВУЗа" },
  { value: "diploma-pp", label: "Диплом о ПП" },
  { value: "diploma-pk", label: "Диплом о ПК" },
  { value: "certificate", label: "Сертификат" },
];

const skillOptions = [
  { value: "bi-analytics", label: "BI-аналитика" },
  { value: "data-science", label: "Data science" },
  { value: "figma", label: "Figma" },
  { value: "python", label: "Python" },
  { value: "copywriting", label: "Копирайтинг" },
  { value: "marketing", label: "Продвижение маркетплейсов-ecommerce" },
  { value: "testing", label: "Тестирование ПО" },
  { value: "sql", label: "SQL" },
  { value: "marketing-analyst", label: "Маркетолог-аналитик" },
];

export function FilterPanel({
  difficulty,
  onDifficultyChange,
  priceRange,
  onPriceRangeChange,
  durationRange,
  onDurationRangeChange,
  documentTypes,
  onDocumentTypesChange,
  skills,
  onSkillsChange,
}: FilterPanelProps) {
  const toggleDocumentType = (type: string) => {
    if (documentTypes.includes(type)) {
      onDocumentTypesChange(documentTypes.filter((t) => t !== type));
    } else {
      onDocumentTypesChange([...documentTypes, type]);
    }
  };

  const toggleSkill = (skill: string) => {
    if (skills.includes(skill)) {
      onSkillsChange(skills.filter((s) => s !== skill));
    } else {
      onSkillsChange([...skills, skill]);
    }
  };

  return (
    <div className="w-72 bg-card rounded-2xl shadow-soft-xl p-5 space-y-6 sticky top-6">
      {/* Sort dropdown */}
      <button className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
        <span>↕️ Популярные</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {/* Difficulty Level */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <BarChart3 className="w-4 h-4" />
          <span>Уровень сложности</span>
        </div>
        <RadioGroup value={difficulty} onValueChange={onDifficultyChange} className="space-y-2">
          {difficultyOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem 
                value={option.value} 
                id={option.value}
                className="border-border text-primary"
              />
              <Label 
                htmlFor={option.value} 
                className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span>₽</span>
          <span>Цена</span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={priceRange[0]}
            onChange={(e) => onPriceRangeChange([Number(e.target.value), priceRange[1]])}
            className="h-8 text-xs bg-card border-border"
          />
          <Input
            type="number"
            value={priceRange[1]}
            onChange={(e) => onPriceRangeChange([priceRange[0], Number(e.target.value)])}
            className="h-8 text-xs bg-card border-border"
          />
        </div>
        <Slider
          value={priceRange}
          onValueChange={(value) => onPriceRangeChange(value as [number, number])}
          min={0}
          // Позволяем фильтровать курсы по цене до 100 000 000 ₽
          max={100000000}
          step={1000}
          className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary"
        />
      </div>

      {/* Duration Range */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Clock className="w-4 h-4" />
          <span>Длительность (ч.)</span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={durationRange[0]}
            onChange={(e) => onDurationRangeChange([Number(e.target.value), durationRange[1]])}
            className="h-8 text-xs bg-card border-border"
          />
          <Input
            type="number"
            value={durationRange[1]}
            onChange={(e) => onDurationRangeChange([durationRange[0], Number(e.target.value)])}
            className="h-8 text-xs bg-card border-border"
          />
        </div>
        <Slider
          value={durationRange}
          onValueChange={(value) => onDurationRangeChange(value as [number, number])}
          min={0}
          max={240}
          step={10}
          className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary"
        />
      </div>

      {/* Document Types */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <FileText className="w-4 h-4" />
          <span>С документами</span>
        </div>
        <div className="space-y-2">
          {documentTypeOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={option.value}
                checked={documentTypes.includes(option.value)}
                onCheckedChange={() => toggleDocumentType(option.value)}
                className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label 
                htmlFor={option.value}
                className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Skills */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Wrench className="w-4 h-4" />
          <span>Навыки</span>
        </div>
        <div className="space-y-2">
          {skillOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`skill-${option.value}`}
                checked={skills.includes(option.value)}
                onCheckedChange={() => toggleSkill(option.value)}
                className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label 
                htmlFor={`skill-${option.value}`}
                className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </div>
        <button className="text-sm text-primary hover:text-purple-dark transition-colors">
          показать ещё ↓
        </button>
      </div>
    </div>
  );
}
