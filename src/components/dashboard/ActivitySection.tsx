import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

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

const ActivitySection = ({ 
  activityStats = defaultActivityStats,
  chartData = defaultChartData 
}: ActivitySectionProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Активность</h2>
      
      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        {activityStats.map((stat, index) => (
          <div 
            key={index}
            className="card-elevated p-4 text-center"
          >
            <div className="text-lg font-bold text-foreground">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>
      
      {/* Chart */}
      <div className="card-elevated p-4">
        <div className="h-40 relative">
          {/* Dotted line indicator */}
          <div className="absolute right-4 top-2 flex items-center gap-2">
            <div className="w-16 h-px border-t-2 border-dashed border-chart-bar opacity-50" />
            <span className="text-xs font-medium text-chart-bar">5 ч.</span>
          </div>
          
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="20%">
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis hide />
              <Bar 
                dataKey="value" 
                radius={[6, 6, 6, 6]}
              >
                {chartData.map((_, index) => (
                  <Cell 
                    key={index}
                    fill={index === 4 ? 'hsl(var(--chart-bar))' : 'hsl(var(--chart-bar-light))'}
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
