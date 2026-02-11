import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BidItem } from '../types';

interface StatusPieChartProps {
  data: BidItem[];
}

export const StatusPieChart: React.FC<StatusPieChartProps> = ({ data }) => {
  // Aggregate data by status
  const statusCounts = data.reduce((acc, item) => {
    // Some statuses might be empty string, handle gracefully
    const status = item.bidNtceSttusNm ? item.bidNtceSttusNm.trim() : '기타';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Convert to array for Recharts
  const chartData = Object.keys(statusCounts)
    .map(status => ({
      name: status,
      value: statusCounts[status]
    }))
    .sort((a, b) => b.value - a.value);

  // Palette: Blue, Green, Amber, Red, Purple, Gray, Cyan, Rose
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280', '#06b6d4', '#e11d48'];

  if (chartData.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-80">
      <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span className="bg-blue-100 text-blue-600 p-1 rounded-md">📊</span> 공고 상태 현황
      </h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={1} />
              ))}
            </Pie>
            <Tooltip 
                formatter={(value: number) => [`${value}건`, '공고 수']}
                contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '8px', 
                    border: '1px solid #f3f4f6', 
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px'
                }}
            />
            <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
