'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('./Chart'), { ssr: false });

interface ChartDataPoint {
  date: string;
  yield: number;
  source: string;
}

interface BondChartProps {
  data: ChartDataPoint[];
  disableDateFilter?: boolean;
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Helper function to format a date for display
const formatDisplayDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
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

export default function BondChart({ data, disableDateFilter = false }: BondChartProps) {
  // All state hooks must be at the top, before any conditional logic
  const [isClient, setIsClient] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Color mapping for different sources
  const colors = {
    'Treasury': '#4f46e5', // Indigo
    'Corporate': '#16a34a', // Green
    'Spread (Corporate - Treasury)': '#dc2626', // Red
  };

  // Separate Treasury and Corporate data
  const treasuryData = data.filter(d => d.source === 'Treasury');
  const corporateData = data
    .filter(d => d.source === 'Corporate')
    .filter(d => d.yield > 0) // Filter out any zero or negative yields
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // minDate and maxDate are derived from startDate and endDate state
  const minDate = useMemo(() => startDate ? new Date(startDate) : new Date(), [startDate]);
  const maxDate = useMemo(() => endDate ? new Date(endDate) : new Date(), [endDate]);

  // All useEffect hooks must be called before any conditional returns
  // Update startDate and endDate when treasuryData changes
  useEffect(() => {
    if (treasuryData.length) {
      const treasuryDates = treasuryData.map(d => new Date(d.date));
      const minDate = new Date(Math.min(...treasuryDates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...treasuryDates.map(d => d.getTime())));
      setStartDate(formatDate(minDate.toISOString()));
      setEndDate(formatDate(maxDate.toISOString()));
    }
  }, [treasuryData]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Validate date range (only if not disabled)
  useEffect(() => {
    if (disableDateFilter) return;
    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date must be before end date.');
    } else if (new Date(startDate) < minDate || new Date(endDate) > maxDate) {
      setError(`Dates must be between ${formatDate(minDate.toISOString())} and ${formatDate(maxDate.toISOString())}.`);
    } else {
      setError(null);
    }
  }, [startDate, endDate, minDate, maxDate, disableDateFilter]);

  // After all hooks, check for missing treasury data
  if (!treasuryData.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No treasury data available for the selected range.</p>
      </div>
    );
  }

  // Get all business days in the selected range
  const selectedStart = disableDateFilter ? minDate : new Date(startDate);
  const selectedEnd = disableDateFilter ? maxDate : new Date(endDate);
  const businessDays = getBusinessDaysInRange(selectedStart, selectedEnd);

  // Create a map of corporate yields with their dates
  const corporateYieldMap = new Map<string, number>();
  let lastKnownCorporateYield: number | null = null;

  // Initialize with the first valid corporate yield in range
  const filteredCorporateData = corporateData.filter(d => new Date(d.date) >= selectedStart && new Date(d.date) <= selectedEnd);
  if (filteredCorporateData.length > 0) {
    lastKnownCorporateYield = filteredCorporateData[0].yield;
  }

  // Fill in all business days with interpolated values for corporate yields
  businessDays.forEach(date => {
    const dateStr = date.toISOString().split('T')[0];
    const actualDataPoint = corporateData.find(d => d.date === dateStr);
    if (actualDataPoint && actualDataPoint.yield > 0) {
      corporateYieldMap.set(dateStr, actualDataPoint.yield);
      lastKnownCorporateYield = actualDataPoint.yield;
    } else if (lastKnownCorporateYield !== null) {
      corporateYieldMap.set(dateStr, lastKnownCorporateYield);
    }
  });

  // Create a map of treasury yields with forward-filling logic
  const treasuryYieldMap = new Map<string, number>();
  let lastKnownTreasuryYield: number | null = null;

  // Initialize with the first valid treasury yield in range
  const filteredTreasuryData = treasuryData.filter(d => new Date(d.date) >= selectedStart && new Date(d.date) <= selectedEnd);
  if (filteredTreasuryData.length > 0) {
    lastKnownTreasuryYield = filteredTreasuryData[0].yield;
  }

  // Fill in all business days with interpolated values for treasury yields
  businessDays.forEach(date => {
    const dateStr = date.toISOString().split('T')[0];
    const actualDataPoint = treasuryData.find(d => d.date === dateStr);
    if (actualDataPoint && actualDataPoint.yield !== null) {
      treasuryYieldMap.set(dateStr, actualDataPoint.yield);
      lastKnownTreasuryYield = actualDataPoint.yield;
    } else if (lastKnownTreasuryYield !== null) {
      treasuryYieldMap.set(dateStr, lastKnownTreasuryYield);
    }
  });

  // Create the combined dataset using only business days in range
  const combinedData = businessDays.map(date => {
    const dateStr = date.toISOString().split('T')[0];
    const treasuryYield = treasuryYieldMap.get(dateStr);
    const corporateYield = corporateYieldMap.get(dateStr);
    const spread = (corporateYield !== undefined && treasuryYield !== undefined)
      ? (corporateYield - treasuryYield) * 100 // Convert to basis points
      : null;
    return {
      date: dateStr,
      formattedDate: formatDate(dateStr),
      treasury_yield: treasuryYield !== undefined ? treasuryYield : null,
      corporate_yield: corporateYield !== undefined ? corporateYield : null,
      spread_yield: spread
    };
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Get the latest values - find the most recent data point with actual data
  // Prioritize finding a point with both treasury and corporate yields, but fall back to what's available
  let latestData = combinedData[combinedData.length - 1];
  
  // First, try to find the latest point with both treasury and corporate yields
  for (let i = combinedData.length - 1; i >= 0; i--) {
    const dataPoint = combinedData[i];
    if (dataPoint.treasury_yield !== null && dataPoint.corporate_yield !== null) {
      latestData = dataPoint;
      break;
    }
  }
  
  // If no point has both, find the latest point with at least treasury yield (for display)
  if (latestData.treasury_yield === null) {
    for (let i = combinedData.length - 1; i >= 0; i--) {
      const dataPoint = combinedData[i];
      if (dataPoint.treasury_yield !== null) {
        latestData = dataPoint;
        break;
      }
    }
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No data available for chart</p>
      </div>
    );
  }

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading chart...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', background: 'white' }}>
      <div className="space-y-6">
        {/* Date Range Selection (only if not disabled) */}
        {!disableDateFilter && (
          <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
            <label className="flex flex-col text-sm font-medium text-black">
              Start Date
              <input
                type="date"
                value={startDate}
                min={formatDate(minDate.toISOString())}
                max={endDate}
                onChange={e => setStartDate(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 mt-1 text-black bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </label>
            <span className="mx-2 text-black">to</span>
            <label className="flex flex-col text-sm font-medium text-black">
              End Date
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={formatDate(maxDate.toISOString())}
                onChange={e => setEndDate(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 mt-1 text-black bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </label>
          </div>
        )}
        {error && !disableDateFilter && (
          <div className="text-red-600 text-sm mb-2">{error}</div>
        )}
        {/* Latest Values Header */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-lg bg-indigo-50">
            <h4 className="text-sm font-medium text-indigo-900 mb-1">Treasury Yield</h4>
            <p className="text-2xl font-bold text-indigo-700 mb-1">
              {latestData?.treasury_yield !== null && latestData?.treasury_yield !== undefined
                ? `${latestData.treasury_yield.toFixed(2)}%`
                : 'N/A'}
            </p>
            <p className="text-xs text-indigo-600">
              as of {latestData ? formatDisplayDate(latestData.date) : ''}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-green-50">
            <h4 className="text-sm font-medium text-green-900 mb-1">Corporate Yield</h4>
            <p className="text-2xl font-bold text-green-700 mb-1">
              {latestData?.corporate_yield !== null && latestData?.corporate_yield !== undefined
                ? `${latestData.corporate_yield.toFixed(2)}%`
                : 'N/A'}
            </p>
            <p className="text-xs text-green-600">
              as of {latestData ? formatDisplayDate(latestData.date) : ''}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-red-50">
            <h4 className="text-sm font-medium text-red-900 mb-1">Spread</h4>
            <p className="text-2xl font-bold text-red-700 mb-1">
              {latestData?.spread_yield !== null && latestData?.spread_yield !== undefined
                ? `${latestData.spread_yield.toFixed(0)} bps`
                : 'N/A'}
            </p>
            <p className="text-xs text-red-600">
              as of {latestData ? formatDisplayDate(latestData.date) : ''}
            </p>
          </div>
        </div>
        {/* Chart Section */}
        <Chart 
          data={combinedData}
          sources={['Treasury', 'Corporate', 'Spread (Corporate - Treasury)']}
          colors={colors}
          yieldKeys={{
            'Treasury': 'treasury_yield',
            'Corporate': 'corporate_yield',
            'Spread (Corporate - Treasury)': 'spread_yield'
          }}
        />
      </div>
    </div>
  );
} 