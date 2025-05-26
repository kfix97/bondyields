'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ChartData {
  date: string;
  formattedDate: string;
  treasury_yield: number | null;
  corporate_yield: number | null;
}

interface ChartProps {
  data: ChartData[];
  sources: string[];
  colors: {
    [key: string]: string;
  };
  yieldKeys: {
    [key: string]: string;
  };
}

export default function Chart({ data, sources, colors, yieldKeys }: ChartProps) {
  // Format dates for tooltip
  const formatTooltipDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 25,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="formattedDate" 
          tick={{ fill: 'black' }}
          interval="preserveEnd"
          minTickGap={50}
          tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { 
            month: 'short',
            year: 'numeric'
          })}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis 
          tick={{ fill: 'black' }}
          label={{ value: 'Yield (%)', angle: -90, position: 'insideLeft', fill: 'black' }}
          domain={['auto', 'auto']}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            color: 'black'
          }}
          labelFormatter={formatTooltipDate}
          formatter={(value: number) => [value.toFixed(2) + '%']}
        />
        <Legend />
        {sources.map(source => (
          <Line
            key={source}
            type="monotone"
            dataKey={yieldKeys[source]}
            name={source}
            stroke={colors[source] || '#999'}
            dot={false}
            strokeWidth={2}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
} 