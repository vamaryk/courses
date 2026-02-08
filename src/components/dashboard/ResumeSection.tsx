import { CheckCircle, Award, Star, Zap, Lightbulb, Rocket, GraduationCap, ChevronRight } from "lucide-react";
import { useState } from "react";

interface Skill {
  name: string;
}

interface Tool {
  name: string;
  color: string;
}

interface ResumeSectionProps {
  skills?: string[];
  tools?: Tool[];
  certificateText?: string;
  jobTitle?: string;
}

const defaultSkills = [
  "Анализ целевой аудитории и проектирование пользовательского опыта.",
  "Создание и разработка дизайн-концепции веб-интерфейса.",
  "Адаптация дизайн-решения для десктопа, планшетов и мобильных устройств.",
  "Создание сайта под ключ на Tilda.",
  "Работа с кернингом, интерлиньяжем, оптической компенсацией.",
  "Создание нужного впечатления с помощью психологии цвета.",
  "Разработка визуального дизайна.",
  "Работа с анимациями и создание интерактивного макета.",
];

const defaultTools = [
  { name: "Sketch", color: "#F7B500" },
  { name: "Figma", color: "#A259FF" },
  { name: "Adobe XD", color: "#FF61F6" },
  { name: "Framer", color: "#0055FF" },
  { name: "HTML5", color: "#E34F26" },
  { name: "CSS3", color: "#1572B6" },
];

// Иконки для маркеров списка (циклически повторяются)
const skillIcons = [
  { icon: Award, color: "text-blue-500" },
  { icon: Lightbulb, color: "text-yellow-500" },
  { icon: Star, color: "text-purple-500" },
  { icon: Zap, color: "text-orange-500" },
  { icon: Rocket, color: "text-cyan-500" },
  { icon: GraduationCap, color: "text-pink-500" },
  { icon: ChevronRight, color: "text-indigo-500" },
];

const ToolWithTooltip = ({ tool }: { tool: Tool }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div 
      className="relative group"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Tool icon */}
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm cursor-pointer transition-all duration-200"
        style={{ backgroundColor: tool.color }}
      >
        {tool.name.charAt(0)}
      </div>
      
      {/* Custom tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className="bg-white text-darkgrey px-4 py-2 rounded-lg text-sm font-medium shadow-lg whitespace-nowrap animate-fade-in">
            {tool.name}
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-foreground rotate-45" />
        </div>
      )}
    </div>
  );
};

const ResumeSection = ({ 
  skills = defaultSkills,
  tools = defaultTools,
  certificateText = "Траляля ляля люлю. Какой-то текстик про сертификат интересненький крутельный ништячковый",
  jobTitle = "Веб-дизайнер"
}: ResumeSectionProps) => {
  return (
    <div className="mt-8 mb-2">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-foreground">Резюме после обучения</h2>
        <span className="text-muted-foreground text-sm">{jobTitle}</span>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Skills card - left column (3/5) */}
        <div className="lg:col-span-3 border rounded-lg p-4">
          <h3 className="text-primary font-semibold mb-4">Навыки</h3>
          <ul className="space-y-3">
            {skills.map((skill, index) => {
              const { icon: Icon, color } = skillIcons[index % skillIcons.length];
              return (
                <li 
                  key={index}
                  className="flex items-start gap-3 group transition-all duration-200 hover:bg-muted/50 p-2 rounded-lg"
                >
                  <div className={`flex-shrink-0 mt-0.5 ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    {skill}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        
        {/* Tools & Certificate column - right column (2/5) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tools card */}
          <div className="border rounded-lg p-4">
            <h3 className="text-primary font-semibold mb-4">Инструменты</h3>
            <div className="flex flex-wrap gap-3">
              {tools.map((tool, index) => (
                <ToolWithTooltip key={index} tool={tool} />
              ))}
            </div>
          </div>
          
          {/* Certificate card */}
          <div className="border rounded-lg p-4">
            <h3 className="text-primary font-semibold mb-4">Сертификат</h3>
            <div className="flex gap-4">
              <div className="w-20 h-28 bg-muted rounded-lg flex items-center justify-center border-2">
                <div className="text-xs text-muted-foreground">Preview</div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {certificateText}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeSection;