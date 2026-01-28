import { cn } from "@/lib/utils";

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: "purple" | "blue" | "green" | "orange";
  children?: React.ReactNode;
}

const colorClasses = {
  purple: "stroke-progress-purple",
  blue: "stroke-progress-blue",
  green: "stroke-progress-green",
  orange: "stroke-progress-orange",
};

const ProgressRing = ({ 
  progress, 
  size = 80, 
  strokeWidth = 6,
  color = "purple",
  children 
}: ProgressRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg 
        className="transform -rotate-90"
        width={size} 
        height={size}
      >
        {/* Background circle */}
        <circle
          className="stroke-muted"
          fill="none"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className={cn("transition-all duration-500 ease-out", colorClasses[color])}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

export default ProgressRing;
