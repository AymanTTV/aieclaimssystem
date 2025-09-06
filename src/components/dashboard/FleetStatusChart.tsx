// src/components/dashboard/FleetStatusChart.tsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useFleetStatus, STATUS_ORDER } from '../../hooks/useFleetStatus';
import type { VehicleStatus } from '../../types';

const STATUS_COLORS: Record<VehicleStatus, string> = {
  available: '#16A34A',
  hired: '#3B82F6',
  'scheduled-rental': '#60A5FA',
  maintenance: '#EAB308',
  'scheduled-maintenance': '#F59E0B',
  claim: '#FB7185',
  unavailable: '#9CA3AF',
  sold: '#A78BFA',
};

type Row = { name: string; key: VehicleStatus; value: number };

const FleetStatusChart: React.FC<{ height?: number }> = ({ height = 300 }) => {
  const { counts, total, loading } = useFleetStatus();

  const data: Row[] = STATUS_ORDER
    .map((s) => ({ key: s, name: s.replace('-', ' '), value: counts[s] || 0 }))
    .filter((r) => r.value > 0);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Fleet Status Distribution</h3>
        {!loading && (
          <span className="text-xs text-gray-500">{total} vehicle{total === 1 ? '' : 's'}</span>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading fleet status…</div>
      ) : total === 0 ? (
        <div className="text-sm text-gray-500">No vehicles found.</div>
      ) : data.length === 0 ? (
        <div className="text-sm text-gray-500">No status data to display.</div>
      ) : (
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
                  <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number, n: string) => [v, n]} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => <span className="text-sm capitalize">{String(value)}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default FleetStatusChart;
