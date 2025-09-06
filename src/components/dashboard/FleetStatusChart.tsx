// src/components/dashboard/FleetStatusChart.tsx
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { Vehicle } from '../../types';

type FleetStatusChartProps = {
  vehicles: Vehicle[];
  height?: number;
};

const STATUS_COLORS: Record<Vehicle['status'], string> = {
  available: '#16A34A',
  hired: '#3B82F6',
  'scheduled-rental': '#60A5FA',
  maintenance: '#EAB308',
  'scheduled-maintenance': '#F59E0B',
  claim: '#8B5CF6',
  sold: '#6B7280',
  unavailable: '#DC2626',
};

const STATUS_ORDER: Vehicle['status'][] = [
  'available',
  'hired',
  'scheduled-rental',
  'maintenance',
  'scheduled-maintenance',
  'claim',
  'sold',
  'unavailable',
];

const FleetStatusChart: React.FC<FleetStatusChartProps> = ({ vehicles, height = 300 }) => {
  const data = useMemo(() => {
    const counts: Record<Vehicle['status'], number> = {
      available: 0,
      hired: 0,
      'scheduled-rental': 0,
      maintenance: 0,
      'scheduled-maintenance': 0,
      claim: 0,
      sold: 0,
      unavailable: 0,
    };

    for (const v of vehicles || []) {
      if ((counts as any)[v.status] === undefined) continue;
      counts[v.status] += 1;
    }

    return STATUS_ORDER
      .map((status) => ({ name: status.replace('-', ' '), key: status, value: counts[status] }))
      .filter((row) => row.value > 0);
  }, [vehicles]);

  const total = useMemo(() => data.reduce((sum, r) => sum + r.value, 0), [data]);

  if (!vehicles || vehicles.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Fleet Status Distribution</h3>
        <div className="text-sm text-gray-500">No vehicles found.</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Fleet Status Distribution</h3>
        <div className="text-sm text-gray-500">No status data to display.</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Fleet Status Distribution</h3>
      <div className="relative" style={{ height }}>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-2xl font-semibold">{total}</div>
            <div className="text-xs text-gray-500">total vehicles</div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="60%"
              outerRadius="85%"
              paddingAngle={2}
              strokeWidth={2}
              isAnimationActive
            >
              {data.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={STATUS_COLORS[entry.key as Vehicle['status']] || '#9CA3AF'}
                  stroke="#ffffff"
                />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => [v, 'Count']} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span className="text-sm capitalize">{String(value)}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default FleetStatusChart;
