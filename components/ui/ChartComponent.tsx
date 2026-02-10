'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useMemo } from 'react';

// ... imports
interface ChartProps {
    data: any[];
    dataKey: string;
    color: string;
    height?: number;
    label?: string;
    unit?: string;
    language?: string;
}

export default function ChartComponent({ data, dataKey, color, height = 200, label, unit, language = 'en' }: ChartProps) {
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];
        return data.map(item => ({
            ...item,
            time: new Date(item.time).toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
        }));
    }, [data, language]);

    if (!data || data.length === 0) {
        return <div className="h-[200px] flex items-center justify-center text-gray-400">No data available</div>;
    }

    return (
        <div style={{ width: '100%', height: height }}>
            <ResponsiveContainer>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fill: '#6b7280' }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={30}
                    />
                    <YAxis
                        tick={{ fontSize: 10, fill: '#6b7280' }}
                        axisLine={false}
                        tickLine={false}
                        domain={['auto', 'auto']}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            fontSize: '12px'
                        }}
                        itemStyle={{ color: color }}
                        labelStyle={{ color: '#374151', marginBottom: '4px' }}
                    />
                    <Area
                        type="monotone"
                        dataKey={dataKey}
                        stroke={color}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill={`url(#gradient-${dataKey})`}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
