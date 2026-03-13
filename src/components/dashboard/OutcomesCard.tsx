import { Plus, Upload, X, FileImage, ChevronDown, Check } from "lucide-react";
import { useState, useRef, useEffect, type DragEvent, type ChangeEvent } from "react";

/** Список доступных инструментов для выбора в карточке курса */
const AVAILABLE_TOOLS = [
  "Figma",
  "Sketch",
  "Adobe XD",
  "Framer",
  "HTML5",
  "CSS3",
  "JavaScript",
  "TypeScript",
  "React",
  "Vue",
  "Angular",
  "Adobe Photoshop",
  "Canva",
];

interface OutcomesCardProps {
  skills: string[];
  tools: string[];
  certificateText: string | null;
  jobTitle: string | null;
  onSkillsChange: (skills: string[]) => void;
  onToolsChange: (tools: string[]) => void;
  onCertificateTextChange: (text: string | null) => void;
  onJobTitleChange: (title: string | null) => void;
}

const OutcomesCard = ({
  skills,
  tools,
  certificateText,
  jobTitle,
  onSkillsChange,
  onToolsChange,
  onCertificateTextChange,
  onJobTitleChange,
}: OutcomesCardProps) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toolsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [toolsOpen]);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.match(/image\/(png|jpeg|jpg)|application\/pdf/)) {
        setUploadedFile(file);
      }
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadedFile(files[0]);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const addValue = (value: string, current: string[], onChange: (items: string[]) => void) => {
    const normalized = value.trim();
    if (!normalized) return;
    if (current.some(item => item.toLowerCase() === normalized.toLowerCase())) {
      return;
    }
    onChange([...current, normalized]);
  };

  const removeValue = (value: string, current: string[], onChange: (items: string[]) => void) => {
    onChange(current.filter(item => item !== value));
  };

  return (
    <div className="border rounded-xl p-4 bg-white animate-fade-in" style={{ animationDelay: "0.25s" }}>
      <h3 className="text-foreground font-semibold mb-4">Резюме после обучения</h3>

      {/* Job Title Input */}
      <div className="relative mb-4">
        <input
          type="text"
          value={jobTitle || ""}
          onChange={(e) => onJobTitleChange(e.target.value.trim() ? e.target.value : null)}
          placeholder="Профессия после обучения"
          className="input-field"
        />
      </div>

      {/* Skills Input */}
      <div className="relative mb-3">
        <input
          type="text"
          value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addValue(skillInput, skills, onSkillsChange);
              setSkillInput("");
            }
          }}
          placeholder="Навыки после обучения"
          className="input-field pr-10"
        />
        <button
          type="button"
          onClick={() => {
            addValue(skillInput, skills, onSkillsChange);
            setSkillInput("");
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:scale-110 transition-transform"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {skills.map((skill) => (
            <span key={skill} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
              {skill}
              <button type="button" onClick={() => removeValue(skill, skills, onSkillsChange)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Software/Tools — выбор из списка (теперь с input-field классом) */}
      <div className="mb-4 relative" ref={toolsDropdownRef}>
        <button
          type="button"
          onClick={() => setToolsOpen((v) => !v)}
          className="input-field flex items-center justify-between text-left cursor-pointer"
        >
          <span className={tools.length === 0 ? "text-muted-foreground" : ""}>
            {tools.length === 0 ? "Используемые программы, инструменты" : tools.join(", ")}
          </span>
          <ChevronDown className="h-5 w-5 shrink-0" />
        </button>
        {toolsOpen && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-input bg-white text-foreground shadow-lg py-1 max-h-[280px] overflow-y-auto">
            {AVAILABLE_TOOLS.map((tool) => {
              const isSelected = tools.some((t) => t.toLowerCase() === tool.toLowerCase());
              return (
                <button
                  key={tool}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      const exact = tools.find((t) => t.toLowerCase() === tool.toLowerCase());
                      if (exact) removeValue(exact, tools, onToolsChange);
                    } else {
                      addValue(tool, tools, onToolsChange);
                    }
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none flex items-center justify-between ${isSelected ? "bg-primary/10 text-primary" : ""}`}
                >
                  {tool}
                  {isSelected && <Check className="w-4 h-4" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {tools.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tools.map((tool) => (
            <span key={tool} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
              {tool}
              <button type="button" onClick={() => removeValue(tool, tools, onToolsChange)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Certificate Upload - Drag & Drop */}
      <div className="mb-4">
        <label className="text-sm text-muted-foreground mb-2 block">
          Загрузить фото сертификата
        </label>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpeg,.jpg,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {uploadedFile ? (
          <div className="bg-input rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileImage className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-foreground text-sm font-medium truncate max-w-[180px]">
                  {uploadedFile.name}
                </p>
                <p className="text-muted-foreground text-xs">
                  {(uploadedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              onClick={handleRemoveFile}
              className="text-muted-foreground hover:text-destructive transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-cover-border hover:border-primary hover:bg-primary/5"
            }`}
          >
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <p className="text-foreground text-sm font-medium mb-1">
              Перетащите файл сюда
            </p>
            <p className="text-muted-foreground text-xs">
              или нажмите для выбора • png, jpeg, pdf
            </p>
          </div>
        )}
      </div>

      {/* Certificate Description */}
      <textarea
        placeholder="Расскажите про сертификат"
        value={certificateText || ""}
        onChange={(e) => onCertificateTextChange(e.target.value.trim() ? e.target.value : null)}
        className="input-field min-h-[100px] resize-none"
        rows={4}
      />
    </div>
  );
};

export default OutcomesCard;