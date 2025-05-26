'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('./Chart'), { ssr: false });

interface ChartDataPoint {
  date: string;
  yield: number;
  source: string;
}

interface ChartData {
  date: string;
  formattedDate: string;
  treasury_yield: number | null;
  corporate_yield: number | null;
}

interface BondChartProps {
  data: ChartDataPoint[];
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Helper function to check if a date is a weekend
const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
};

// Helper function to get all business days between two dates
const getBusinessDaysInRange = (startDate: Date, endDate: Date) => {
  const dates = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    if (!isWeekend(currentDate)) {
      dates.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
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

  // Separate Treasury and Corporate data
  const treasuryData = data.filter(d => d.source === 'Treasury');
  const corporateData = data
    .filter(d => d.source === 'Corporate AAA')
    .filter(d => d.yield > 0) // Filter out any zero or negative yields
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Get the date range from Treasury data (which already excludes weekends)
  const treasuryDates = treasuryData.map(d => new Date(d.date));
  const startDate = new Date(Math.min(...treasuryDates.map(d => d.getTime())));
  const endDate = new Date(Math.max(...treasuryDates.map(d => d.getTime())));

  // Get all business days in the range
  const businessDays = getBusinessDaysInRange(startDate, endDate);

  // Create a map of corporate yields with their dates
  const corporateYieldMap = new Map<string, number>();
  let lastKnownCorporateYield: number | null = null;

  // Initialize with the first valid corporate yield
  if (corporateData.length > 0) {
    lastKnownCorporateYield = corporateData[0].yield;
  }

  // Fill in all business days with interpolated values
  businessDays.forEach(date => {
    const dateStr = date.toISOString().split('T')[0];
    
    // Find the actual corporate data point for this date
    const actualDataPoint = corporateData.find(d => d.date === dateStr);
    
    if (actualDataPoint && actualDataPoint.yield > 0) {
      // If we have valid data for this date, use it
      corporateYieldMap.set(dateStr, actualDataPoint.yield);
      lastKnownCorporateYield = actualDataPoint.yield;
    } else if (lastKnownCorporateYield !== null) {
      // Otherwise use the last known valid value
      corporateYieldMap.set(dateStr, lastKnownCorporateYield);
    }
  });

  // Create the combined dataset using only business days
  const combinedData = businessDays.map(date => {
    const dateStr = date.toISOString().split('T')[0];
    const treasuryPoint = treasuryData.find(d => d.date === dateStr);
    const corporateYield = corporateYieldMap.get(dateStr);
    
    return {
      date: dateStr,
      formattedDate: formatDate(dateStr),
      treasury_yield: treasuryPoint?.yield || null,
      corporate_yield: corporateYield || null
    };
  });

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
        <p>Business days: {combinedData.length}</p>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4 text-center">Treasury vs Corporate AAA Yield Comparison</h3>
        <Chart 
          data={combinedData}
          sources={['Treasury', 'Corporate AAA']}
          colors={colors}
          yieldKeys={{
            'Treasury': 'treasury_yield',
            'Corporate AAA': 'corporate_yield'
          }}
        />
      </div>
    </div>
  );
} 