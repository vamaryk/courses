import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const API_URL = import.meta.env.VITE_API_URL || '';

interface ChartData {
  name: string;
  value: number;
  color: string;
}

interface ChartResponse {
  data: ChartData[];
  totalProgress: number;
}

const StatisticsChart = () => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [totalProgress, setTotalProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/users/profile/statistics/chart`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data: ChartResponse = await response.json();
          setChartData(data.data);
          setTotalProgress(data.totalProgress);
        } else {
          console.error('Не удалось получить данные графика:', response.statusText);
          setChartData([]);
          setTotalProgress(0);
        }
      } catch (error) {
        console.error('Ошибка при получении данных графика:', error);
        setChartData([]);
        setTotalProgress(0);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl p-6 border-1 border-muted-foreground/30 flex-1 min-w-0">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="rounded-3xl p-6 border-1 border-muted-foreground/30 flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">Статистика</h3>
            <p className="text-xs text-muted-foreground">за всё время</p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground text-center py-8">
          Нет данных для отображения
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl p-6 border-1 border-muted-foreground/30 flex-1 min-w-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">Статистика</h3>
          <p className="text-xs text-muted-foreground">за всё время</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative w-full max-w-[144px] h-[144px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-foreground">{totalProgress} %</span>
          </div>
        </div>
        <div className="flex-1 space-y-2 w-full sm:w-auto">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className={`text-sm ${index === 0 ? 'text-secondary font-medium' : 'text-muted-foreground'}`}>
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatisticsChart;