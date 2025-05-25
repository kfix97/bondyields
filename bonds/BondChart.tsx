'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('./Chart'), { ssr: false });

interface ChartDataPoint {
  date: string;
  yield: number;
  source: string;
}

interface BondChartProps {
  data: ChartDataPoint[];
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function BondChart({ data }: BondChartProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  console.log('BondChart rendering with data:', data);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No data available for chart</p>
      </div>
    );
  }

  // Group data by source
  const sources = Array.from(new Set(data.map(d => d.source)));
  
  // Color mapping for different sources
  const colors = {
    'FRED': '#4f46e5', // Indigo
    'Alpha Vantage': '#16a34a', // Green
    'Corporate AAA': '#eab308' // Yellow
  };

  // Format dates consistently
  const formattedData = data.map(d => ({
    ...d,
    formattedDate: formatDate(d.date)
  }));

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading chart...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', background: 'white' }}>
      <div style={{ padding: '20px', color: 'black' }}>
        <p>Available sources: {sources.join(', ')}</p>
        <p>Data points: {formattedData.length}</p>
      </div>
      
      <Chart 
        data={formattedData}
        sources={sources}
        colors={colors}
      />
    </div>
  );
} 