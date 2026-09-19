import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Vehicle } from '../../types';

interface FleetDistributionChartProps {
  vehicles: Vehicle[];
}

export const FleetDistributionChart: React.FC<FleetDistributionChartProps> = ({ vehicles }) => {
  const chartData = useMemo(() => {
    const statuses = {
      active: 0,
      maintenance: 0,
      rented: 0,
      claim: 0,
      unavailable: 0,
    };

    vehicles.forEach(v => {
      if (v.status in statuses) {
        statuses[v.status as keyof typeof statuses]++;
      }
    });

    return [
      { name: 'Active', value: statuses.active, color: '#10B981' },
      { name: 'Rented', value: statuses.rented, color: '#3B82F6' },
      { name: 'Maintenance', value: statuses.maintenance, color: '#F59E0B' },
      { name: 'Claims', value: statuses.claim, color: '#EF4444' },
      { name: 'Unavailable', value: statuses.unavailable, color: '#6B7280' },
    ].filter(item => item.value > 0);
  }, [vehicles]);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[400px] flex flex-col">
      <h3 className="text-lg font-bold text-gray-800 mb-2 font-display">Fleet Utilization</h3>
      <div className="flex-1 w-full min-h-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={120}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ fontWeight: 600, color: '#374151' }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              formatter={(value) => value}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
          <span className="text-4xl font-bold text-gray-900">{vehicles.length}</span>
          <span className="text-sm font-medium text-gray-500">Total Vehicles</span>
        </div>
      </div>
    </div>
  );
};
