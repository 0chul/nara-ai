import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { BidItem } from '../types';

interface TrendChartProps {
    data: BidItem[];
}

export const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
    // Group and sort data by date (YYYY-MM-DD)
    const dateMap = data.reduce((acc, item) => {
        if (!item.bidNtceDt) return acc;
        // Extract YYYYMMDD and format to YYYY-MM-DD
        const dateStr = item.bidNtceDt.substring(0, 8);
        const formatted = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
        acc[formatted] = (acc[formatted] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const chartData = Object.keys(dateMap)
        .map(date => ({ date, count: dateMap[date] }))
        .sort((a, b) => a.date.localeCompare(b.date));

    if (chartData.length === 0) return null;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-80">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-600 p-1 rounded-md">📈</span> 일자별 수집 추이
            </h3>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis
                            dataKey="date"
                            fontSize={10}
                            tickFormatter={(str) => str.substring(5)} // Show MM-DD
                            axisLine={false}
                            tickLine={false}
                            minTickGap={30}
                        />
                        <YAxis
                            fontSize={10}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                borderRadius: '8px',
                                border: 'none',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                fontSize: '12px'
                            }}
                            labelClassName="font-bold text-gray-700"
                        />
                        <Area
                            type="monotone"
                            dataKey="count"
                            name="공고 수"
                            stroke="#6366f1"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorCount)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
