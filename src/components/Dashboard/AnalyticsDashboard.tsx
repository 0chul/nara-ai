import React from 'react';
import { BarChart3 } from 'lucide-react';
import { BidItem } from '../../types';
import { TrendChart } from '../TrendChart';
import { StatusPieChart } from '../StatusPieChart';
import { StatsChart } from '../StatsChart';

interface AnalyticsDashboardProps {
    data: BidItem[];
    loading: boolean;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ data, loading }) => {
    if (data.length === 0 || loading) return null;

    return (
        <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-bold text-gray-800">데이터 분석 대시보드</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <TrendChart data={data} />
                <StatusPieChart data={data} />
                <StatsChart data={data} />
            </div>
        </div>
    );
};
