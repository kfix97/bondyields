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

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No data available for chart</p>
      </div>
    );
  }

  // Color mapping for different sources
  const colors = {
    'Treasury': '#4f46e5', // Indigo
    'Corporate AAA': '#16a34a', // Green
  };

  // Format and separate data by source
  const treasuryData = data
    .filter(d => d.source === 'Treasury')
    .map(d => ({
      date: d.date,
      formattedDate: formatDate(d.date),
      yield: d.yield,
      source: 'Treasury' as const
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const corporateData = data
    .filter(d => d.source === 'Corporate AAA')
    .map(d => ({
      date: d.date,
      formattedDate: formatDate(d.date),
      yield: d.yield,
      source: 'Corporate AAA' as const
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
        <p>Data points: Treasury ({treasuryData.length}), Corporate AAA ({corporateData.length})</p>
      </div>
      
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-center">10-Year Treasury Yield</h3>
          <Chart 
            data={treasuryData}
            sources={['Treasury']}
            colors={colors}
          />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-4 text-center">Corporate AAA Yield</h3>
          <Chart 
            data={corporateData}
            sources={['Corporate AAA']}
            colors={colors}
          />
        </div>
      </div>
    </div>
  );
} 