'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  YAxisProps
} from 'recharts';

interface ChartData {
  date: string;
  formattedDate: string;
  treasury_yield: number | null;
  corporate_yield: number | null;
  spread_yield: number | null;
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

  // Custom tooltip formatter to handle different value types
  const formatTooltipValue = (value: number, name: string) => {
    if (name === 'Spread (Corporate - Treasury)') {
      return [value.toFixed(2) + ' bps', 'Spread'];
    }
    return [value.toFixed(2) + '%', name];
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
          yAxisId="yield"
          tick={{ fill: 'black' }}
          label={{ value: 'Yield (%)', angle: -90, position: 'insideLeft', fill: 'black' }}
          domain={['auto', 'auto']}
        />
        <YAxis 
          yAxisId="spread"
          orientation="right"
          tick={{ fill: '#dc2626' }}
          label={{ value: 'Spread (bps)', angle: 90, position: 'insideRight', fill: '#dc2626' }}
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
          formatter={formatTooltipValue}
        />
        <Legend />
        {sources.map(source => {
          const isSpread = source === 'Spread (Corporate - Treasury)';
          return (
            <Line
              key={source}
              type="monotone"
              dataKey={yieldKeys[source]}
              name={source}
              stroke={colors[source] || '#999'}
              dot={false}
              strokeWidth={2}
              connectNulls
              yAxisId={isSpread ? 'spread' : 'yield'}
              strokeDasharray={isSpread ? '5 5' : undefined}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
} 