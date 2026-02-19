import { useState } from "react";
import {
  SiSketch,
  SiFigma,
  SiAdobexd,
  SiFramer,
  SiHtml5,
  SiCss3,
  SiJavascript,
  SiTypescript,
  SiReact,
  SiVuedotjs,
  SiAngular,
  SiAdobephotoshop,
  SiCanva,
} from "react-icons/si";
import { Award, Star, Zap, Lightbulb, Rocket, GraduationCap, ChevronRight } from "lucide-react";
import type { IconType } from "react-icons";

interface Tool {
  name: string;
  color: string;
  icon?: IconType;
}

interface ResumeSectionProps {
  skills?: string[];
  tools?: Array<Tool | string>;
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
  { name: "Sketch", color: "#F7B500", icon: SiSketch },
  { name: "Figma", color: "#A259FF", icon: SiFigma },
  { name: "Adobe XD", color: "#FF61F6", icon: SiAdobexd },
  { name: "Framer", color: "#0055FF", icon: SiFramer },
  { name: "HTML5", color: "#E34F26", icon: SiHtml5 },
  { name: "CSS3", color: "#1572B6", icon: SiCss3 },
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

const getToolMeta = (toolName: string): Tool => {
  const name = toolName.trim();
  const lower = name.toLowerCase();

  if (lower.includes("figma")) return { name, color: "#A259FF", icon: SiFigma };
  if (lower.includes("sketch")) return { name, color: "#F7B500", icon: SiSketch };
  if (lower.includes("adobe xd") || lower === "xd") return { name, color: "#FF61F6", icon: SiAdobexd };
  if (lower.includes("framer")) return { name, color: "#0055FF", icon: SiFramer };
  if (lower.includes("html")) return { name, color: "#E34F26", icon: SiHtml5 };
  if (lower.includes("css")) return { name, color: "#1572B6", icon: SiCss3 };
  if (lower.includes("javascript") || lower === "js") return { name, color: "#F7DF1E", icon: SiJavascript };
  if (lower.includes("typescript") || lower === "ts") return { name, color: "#3178C6", icon: SiTypescript };
  if (lower.includes("react")) return { name, color: "#61DAFB", icon: SiReact };
  if (lower.includes("vue")) return { name, color: "#42B883", icon: SiVuedotjs };
  if (lower.includes("angular")) return { name, color: "#DD0031", icon: SiAngular };
  if (lower.includes("photoshop") || lower.includes("adobe ps")) return { name, color: "#001E36", icon: SiAdobephotoshop };
  if (lower.includes("canva")) return { name, color: "#00C4CC", icon: SiCanva };

  return { name, color: "#64748B" };
};

const ToolWithTooltip = ({ tool }: { tool: Tool }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const Icon = tool.icon;

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
        {Icon ? <Icon className="w-5 h-5 text-white" /> : tool.name.charAt(0)}
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
  const normalizedTools: Tool[] = tools.map((tool) => {
    if (typeof tool === "string") {
      return getToolMeta(tool);
    }
    if (tool.icon) {
      return tool;
    }
    return getToolMeta(tool.name);
  });

  return (
    <div className="mt-8 mb-2">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-foreground">Резюме после обучения</h2>
        <span className="text-muted-foreground text-sm">{jobTitle}</span>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Skills card */}
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
        
        {/* Tools & Certificate column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tools card */}
          <div className="border rounded-lg p-4">
            <h3 className="text-primary font-semibold mb-4">Инструменты</h3>
            <div className="flex flex-wrap gap-3">
              {normalizedTools.map((tool, index) => (
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