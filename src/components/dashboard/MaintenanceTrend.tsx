import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MaintenanceLog } from '../../types';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';

interface MaintenanceTrendProps {
  logs: MaintenanceLog[];
}

const MaintenanceTrend: React.FC<MaintenanceTrendProps> = ({ logs }) => {
  const now = new Date();
  const sixMonthsAgo = subMonths(now, 6);
  const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });

  const data = months.map(month => {
    const monthLogs = logs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= startOfMonth(month) && logDate <= endOfMonth(month);
    });

    return {
      month: format(month, 'MMM yyyy'),
      cost: monthLogs.reduce((sum, log) => sum + log.cost, 0),
      count: monthLogs.length
    };
  });

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="cost"
            stroke="#DC2626"
            name="Cost ($)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="count"
            stroke="#16A34A"
            name="Number of Maintenance"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MaintenanceTrend;