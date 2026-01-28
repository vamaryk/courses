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

const ResumeSection = ({ 
  skills = defaultSkills,
  tools = defaultTools,
  certificateText = "Траляля ляля люлю. Какой-то текстик про сертификат интересненький крутельный ништячковый",
  jobTitle = "Веб-дизайнер"
}: ResumeSectionProps) => {
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">Резюме после обучения</h2>
        <span className="text-muted-foreground text-sm">{jobTitle}</span>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Skills card */}
        <div className="lg:col-span-2 card-elevated p-6">
          <h3 className="text-primary font-semibold mb-4">Навыки</h3>
          <ul className="space-y-3">
            {skills.map((skill, index) => (
              <li 
                key={index}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="text-foreground mt-1.5">•</span>
                <span>{skill}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Tools & Certificate column */}
        <div className="space-y-4">
          {/* Tools card */}
          <div className="card-elevated p-6">
            <h3 className="text-primary font-semibold mb-4">Инструменты</h3>
            <div className="flex flex-wrap gap-3">
              {tools.map((tool, index) => (
                <div 
                  key={index}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm"
                  style={{ backgroundColor: tool.color }}
                  title={tool.name}
                >
                  {tool.name.charAt(0)}
                </div>
              ))}
            </div>
          </div>
          
          {/* Certificate card */}
          <div className="card-elevated p-6">
            <h3 className="text-primary font-semibold mb-4">Сертификат</h3>
            <div className="flex gap-4">
              <div className="w-20 h-28 bg-muted rounded-lg flex items-center justify-center">
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
