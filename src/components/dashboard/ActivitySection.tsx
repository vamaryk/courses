import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";

interface ActivityStats {
  value: string;
  label: string;
}

interface ChartData {
  day: string;
  value: number;
}

interface ActivitySectionProps {
  activityStats?: ActivityStats[];
  chartData?: ChartData[];
}

const defaultActivityStats: ActivityStats[] = [
  { value: "39 мин", label: "сегодня" },
  { value: "4 часа", label: "на этой неделе" },
  { value: "10 часов", label: "всего" },
];

const defaultChartData: ChartData[] = [
  { day: "Пн", value: 40 },
  { day: "Вт", value: 65 },
  { day: "Ср", value: 85 },
  { day: "Чт", value: 70 },
  { day: "Пт", value: 90 },
  { day: "Сб", value: 50 },
  { day: "Вс", value: 30 },
];

// Кастомный тултип
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const minutes = payload[0].value;
    
    let timeText = '';
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      timeText = remainingMinutes > 0 
        ? `${hours} ч ${remainingMinutes} мин`
        : `${hours} ч`;
    } else {
      timeText = `${minutes} мин`;
    }

    return (
      <div className="bg-white border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-bold text-foreground">{timeText}</p>
      </div>
    );
  }

  return null;
};

const ActivitySection = ({ 
  activityStats = defaultActivityStats,
  chartData = defaultChartData 
}: ActivitySectionProps) => {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-foreground">Активность</h2>
      
      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-2">
        {activityStats.map((stat, index) => (
          <div 
            key={index}
            className="border rounded-lg p-4 text-center"
          >
            <div className="text-sm font-bold text-foreground">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>
      
      {/* Chart */}
      <div className="border rounded-lg p-4">
        <div className="h-40 relative">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              barCategoryGap="20%"
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
              <Bar 
                dataKey="value" 
                radius={[6, 6, 6, 6]}
              >
                {chartData.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={index === 4 ? 'hsl(var(--chart-bar))' : 'hsl(var(--chart-bar-light))'}
                    className="transition-all duration-200 cursor-pointer"
                    style={{ opacity: 0.8 }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ActivitySection;