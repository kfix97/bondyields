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

interface ChartProps {
  data: Array<{
    date: string;
    yield: number;
    source: string;
    formattedDate: string;
  }>;
  sources: string[];
  colors: {
    [key: string]: string;
  };
}

export default function Chart({ data, sources, colors }: ChartProps) {
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
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="formattedDate" 
          tick={{ fill: 'black' }}
          interval="preserveStartEnd"
          tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
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
            dataKey="yield"
            data={data.filter(d => d.source === source)}
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