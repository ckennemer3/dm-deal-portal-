'use client';

import { BottleneckPhase } from '@/lib/reporting-queries';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface BottleneckChartProps {
  data: BottleneckPhase[];
}

/**
 * Horizontal bar chart showing average time per deal phase for completed deals.
 */
export function BottleneckChart({ data }: Readonly<BottleneckChartProps>) {
  if (data.every(d => d.avgHours === 0)) {
    return <p className="text-sm text-surface-500 py-4">No completed deal data available.</p>;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 120 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            label={{ value: 'Avg Hours', position: 'insideBottom', offset: -5 }}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="phase"
            width={110}
            tick={{ fontSize: 12 }}
          />
          <Tooltip formatter={(v) => `${v}h`} />
          <Bar dataKey="avgHours" radius={[0, 4, 4, 0]} name="Avg Hours">
            {data.map((entry) => (
              <Cell key={`bottleneck-cell-${entry.phase}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
