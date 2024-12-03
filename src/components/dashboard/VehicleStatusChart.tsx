import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Vehicle } from '../../types';

interface VehicleStatusChartProps {
  vehicles: Vehicle[];
}

const COLORS = {
  active: '#16A34A',
  maintenance: '#EAB308',
  unavailable: '#DC2626'
};

const VehicleStatusChart: React.FC<VehicleStatusChartProps> = ({ vehicles }) => {
  const data = [
    { name: 'Active', value: vehicles.filter(v => v.status === 'active').length },
    { name: 'Maintenance', value: vehicles.filter(v => v.status === 'maintenance').length },
    { name: 'Unavailable', value: vehicles.filter(v => v.status === 'unavailable').length }
  ];

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS]} 
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default VehicleStatusChart;