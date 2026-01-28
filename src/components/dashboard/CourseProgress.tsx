import ProgressRing from "./ProgressRing";

interface ProgressData {
  value: string;
  label: string;
  progress: number;
  color: "purple" | "blue" | "green" | "orange";
}

interface CourseProgressProps {
  progressData?: ProgressData[];
}

const defaultProgressData: ProgressData[] = [
  { value: "176", label: "часов", progress: 45, color: "purple" },
  { value: "95%", label: "пройдено", progress: 95, color: "blue" },
  { value: "190", label: "лекций", progress: 78, color: "green" },
  { value: "1k+", label: "процесс", progress: 60, color: "orange" },
];

const CourseProgress = ({ progressData = defaultProgressData }: CourseProgressProps) => {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {progressData.map((item, index) => (
        <div 
          key={index}
          className="card-elevated p-4 flex flex-col items-center gap-2"
        >
          <ProgressRing 
            progress={item.progress} 
            color={item.color}
            size={70}
            strokeWidth={5}
          >
            <span className="text-sm font-bold text-foreground">{item.value}</span>
          </ProgressRing>
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default CourseProgress;
