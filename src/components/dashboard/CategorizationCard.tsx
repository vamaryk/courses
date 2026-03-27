import { ChevronDown, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  placeholder: string;
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string | null) => void;
}

const Combobox = ({ placeholder, options, value, onChange }: ComboboxProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const option = options.find(opt => opt.value === value);
      if (option) {
        setInputValue(option.label);
      }
    } else {
      setInputValue("");
    }
  }, [value, options]);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option: ComboboxOption) => {
    onChange(option.value);
    setInputValue(option.label);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setInputValue("");
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            onChange(null);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="input-field pr-16"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {inputValue && (
            <button
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-primary hover:scale-110 transition-transform"
          >
            <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-border overflow-hidden animate-scale-in">
          {filteredOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option)}
              className={`w-full text-left px-4 py-3 hover:bg-muted transition-colors ${
                value === option.value ? "bg-primary/10 text-primary" : "text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const specialtyOptions = [
  { value: "design", label: "Дизайн" },
  { value: "development", label: "Разработка" },
  { value: "marketing", label: "Маркетинг" },
  { value: "business", label: "Бизнес" },
  { value: "photography", label: "Фотография" },
];

const tagsOptions = [
  { value: "beginner", label: "Для начинающих" },
  { value: "advanced", label: "Продвинутый" },
  { value: "professional", label: "Профессиональный" },
  { value: "practical", label: "Практический" },
  { value: "theory", label: "Теоретический" },
];

const audienceOptions = [
  { value: "students", label: "Студенты" },
  { value: "professionals", label: "Специалисты" },
  { value: "everyone", label: "Все желающие" },
  { value: "entrepreneurs", label: "Предприниматели" },
  { value: "freelancers", label: "Фрилансеры" },
];

interface CategorizationCardProps {
  specialty: string | null;
  tags: string[];
  targetAudience: string | null;
  aboutCourse: string | null;
  onSpecialtyChange: (specialty: string | null) => void;
  onTagsChange: (tags: string[]) => void;
  onTargetAudienceChange: (targetAudience: string | null) => void;
  onAboutCourseChange: (aboutCourse: string) => void;
}

const CategorizationCard = ({
  specialty,
  tags,
  targetAudience,
  aboutCourse,
  onSpecialtyChange,
  onTagsChange,
  onTargetAudienceChange,
  onAboutCourseChange,
}: CategorizationCardProps) => {
  return (
    <div className="border rounded-xl p-4 bg-white animate-fade-in" style={{ animationDelay: "0.15s" }}>
      {/* Specialty Combobox */}
      <div className="mb-4">
        <Combobox
          placeholder="Специальность"
          options={specialtyOptions}
          value={specialty}
          onChange={onSpecialtyChange}
        />
      </div>

      {/* Tags Combobox - можно сделать множественный выбор, но пока оставим один */}
      <div className="mb-4">
        <Combobox
          placeholder="Теги"
          options={tagsOptions}
          value={tags.length > 0 ? tags[0] : null}
          onChange={(value) => onTagsChange(value ? [value] : [])}
        />
      </div>

      {/* Target Audience Combobox */}
      <div className="mb-4">
        <Combobox
          placeholder="Для кого предназначен этот курс?"
          options={audienceOptions}
          value={targetAudience}
          onChange={onTargetAudienceChange}
        />
      </div>

      {/* About Course Textarea */}
      <textarea
        placeholder="О чём Ваш курс?..."
        className="input-field min-h-[180px] resize-y"
        rows={8}
        value={aboutCourse || ""}
        onChange={(e) => onAboutCourseChange(e.target.value)}
      />
    </div>
  );
};

export default CategorizationCard;
