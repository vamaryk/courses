import { ChevronDown, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  placeholder: string;
  options: ComboboxOption[];
}

const Combobox = ({ placeholder, options }: ComboboxProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

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
    setSelectedValue(option.value);
    setInputValue(option.label);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedValue(null);
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
            setSelectedValue(null);
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
        <div className="absolute z-50 w-full mt-1 bg-popover rounded-xl shadow-lg border border-border overflow-hidden animate-scale-in">
          {filteredOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option)}
              className={`w-full text-left px-4 py-3 hover:bg-muted transition-colors ${
                selectedValue === option.value ? "bg-primary/10 text-primary" : "text-foreground"
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

const CategorizationCard = () => {
  return (
    <div className="card-blue animate-fade-in" style={{ animationDelay: "0.15s" }}>
      {/* Specialty Combobox */}
      <div className="mb-4">
        <Combobox placeholder="Специальность" options={specialtyOptions} />
      </div>

      {/* Tags Combobox */}
      <div className="mb-4">
        <Combobox placeholder="Теги" options={tagsOptions} />
      </div>

      {/* Target Audience Combobox */}
      <div className="mb-4">
        <Combobox placeholder="Для кого предназначен этот курс?" options={audienceOptions} />
      </div>

      {/* About Course Textarea */}
      <textarea
        placeholder="О чем ваш курс?..."
        className="input-field min-h-[100px] resize-none"
        rows={4}
      />
    </div>
  );
};

export default CategorizationCard;
