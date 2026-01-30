import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BidItem } from '../types';

interface StatsChartProps {
  data: BidItem[];
}

export const StatsChart: React.FC<StatsChartProps> = ({ data }) => {
  // Aggregate data by Notice Institution
  const agencyCounts = data.reduce((acc, item) => {
    const name = item.ntceInsttNm;
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.keys(agencyCounts)
    .map(name => ({ name, count: agencyCounts[name] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5

  if (chartData.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-64">
      <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">주요 발주 기관 (Top 5)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={120} tick={{fontSize: 11}} interval={0} />
          <Tooltip 
            cursor={{fill: 'transparent'}}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
          />
          <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index === 0 ? '#2563eb' : '#60a5fa'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};