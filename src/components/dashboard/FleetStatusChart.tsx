import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartData
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface FleetStatusChartProps {
  data: ChartData<'doughnut'>;
}

const FleetStatusChart: React.FC<FleetStatusChartProps> = ({ data }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const
      }
    },
    cutout: '70%'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Fleet Status Distribution</h3>
      <div className="h-[300px]">
        <Doughnut options={options} data={data} />
      </div>
    </div>
  );
};

export default FleetStatusChart;