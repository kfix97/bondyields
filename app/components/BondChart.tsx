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
// Parse date string as local date to avoid timezone conversion issues
const formatDisplayDate = (dateStr: string) => {
  // Parse YYYY-MM-DD format as local date to avoid UTC timezone conversion
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  return date.toLocaleDateString('en-US', {
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

// Helper function to safely format a date for logging (never throws)
const safeFormatDateForLog = (date: Date | null | undefined): string => {
  try {
    if (date && !isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // Fallback if anything fails
  }
  return new Date().toISOString().split('T')[0];
};

// Helper to safely log (only in non-test environments to avoid test failures)
const safeLog = (...args: unknown[]) => {
  // Only log if not in test environment (NODE_ENV !== 'test')
  if (process.env.NODE_ENV !== 'test') {
    try {
      console.log(...args);
    } catch {
      // Silently fail if logging fails
    }
  }
};

// Helper function to get all business days between two dates
const getBusinessDaysInRange = (startDate: Date, endDate: Date) => {
  // Validate dates before processing
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.warn('Component: Invalid dates passed to getBusinessDaysInRange, returning empty array');
    return [];
  }
  
  const dates = [];
  const currentDate = new Date(startDate);
  const validEndDate = new Date(endDate);
  
  while (currentDate <= validEndDate) {
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
  // Ensure they're always valid dates
  const minDate = useMemo(() => {
    if (startDate) {
      const date = new Date(startDate);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    return new Date();
  }, [startDate]);
  const maxDate = useMemo(() => {
    if (endDate) {
      const date = new Date(endDate);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    return new Date();
  }, [endDate]);

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

  // Determine the actual date range to display
  // When disableDateFilter is true, we need to exclude absolute latest outliers
  // that may have been added by the API outside the requested range
  // Initialize to valid dates to prevent any undefined/invalid date errors
  let selectedStart: Date = new Date();
  let selectedEnd: Date = new Date();
  
  if (disableDateFilter) {
    // Calculate range from Treasury data (which is working correctly)
    // Treasury data should represent the requested range, excluding absolute latest outliers
    if (treasuryData.length > 0) {
      const treasuryDates = treasuryData
        .map(d => new Date(d.date))
        .filter(d => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());
      
      if (treasuryDates.length === 0) {
        // All dates were invalid, use fallback
        selectedStart = new Date();
        selectedEnd = new Date();
      } else {
        selectedStart = treasuryDates[0];
      
      // Check Treasury dates for gaps at the end (absolute latest would be at the very end)
      if (treasuryDates.length >= 2) {
        const lastTreasuryDate = treasuryDates[treasuryDates.length - 1];
        const secondLastTreasuryDate = treasuryDates[treasuryDates.length - 2];
        const daysDiff = (lastTreasuryDate.getTime() - secondLastTreasuryDate.getTime()) / (1000 * 60 * 60 * 24);
        
        // If there's a significant gap at the very end in Treasury data, exclude the absolute latest
        if (daysDiff > 7) {
          selectedEnd = secondLastTreasuryDate;
          console.log('Component: Found gap in Treasury data at end (>7 days), excluding absolute latest. Using end date:', safeFormatDateForLog(selectedEnd));
        } else {
          // Check if there are multiple consecutive gaps at the end (last 3 dates)
          // Only exclude the second-to-last point if BOTH gaps are significant and consecutive at the end
          // This ensures we don't exclude legitimate data due to historical gaps elsewhere in the dataset
          if (treasuryDates.length >= 3) {
            const thirdLastTreasuryDate = treasuryDates[treasuryDates.length - 3];
            const daysDiff2 = (secondLastTreasuryDate.getTime() - thirdLastTreasuryDate.getTime()) / (1000 * 60 * 60 * 24);
            // Only exclude if BOTH gaps are significant (both > 7 days) - indicates consecutive outliers at the end
            // If daysDiff2 is large but daysDiff is small, it's a historical gap, not an outlier at the end
            if (daysDiff > 7 && daysDiff2 > 7) {
              // Both last dates have significant consecutive gaps, likely both are absolute latest outliers
              selectedEnd = thirdLastTreasuryDate;
              console.log('Component: Found consecutive large gaps at end of Treasury data, excluding absolute latest outliers. Using end date:', safeFormatDateForLog(selectedEnd));
            } else {
              // No consecutive large gaps at the end, use the latest date
              // (daysDiff2 might be large due to historical gaps, but that's not an outlier at the end)
              selectedEnd = lastTreasuryDate;
              console.log('Component: No consecutive large gaps at end of Treasury data, using latest date:', safeFormatDateForLog(selectedEnd));
            }
          } else {
            selectedEnd = lastTreasuryDate;
            console.log('Component: Using latest Treasury date (insufficient data to check for gaps):', safeFormatDateForLog(selectedEnd));
          }
        }
      } else {
        // Only one Treasury date, use it
        selectedEnd = treasuryDates[0];
      }
      }
    } else if (data.length > 0) {
      // Fallback to all data if no Treasury data
      const allDates = data
        .map(d => new Date(d.date))
        .filter(d => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());
      
      if (allDates.length > 0) {
        selectedStart = allDates[0];
        selectedEnd = allDates[allDates.length - 1];
        console.log('Component: No Treasury data, using all data range:', safeFormatDateForLog(selectedStart), 'to', safeFormatDateForLog(selectedEnd));
      } else {
        selectedStart = new Date();
        selectedEnd = new Date();
      }
    } else {
      selectedStart = minDate;
      selectedEnd = maxDate;
    }
  } else {
    // Use the date range from state (set by useEffect from treasuryData)
    // If startDate/endDate are not set yet (before useEffect runs), compute from data
    if (startDate && endDate) {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      if (!isNaN(startDateObj.getTime()) && !isNaN(endDateObj.getTime())) {
        selectedStart = startDateObj;
        selectedEnd = endDateObj;
      } else {
        // Invalid dates, compute from data
        if (treasuryData.length > 0) {
          const treasuryDates = treasuryData
            .map(d => new Date(d.date))
            .filter(d => !isNaN(d.getTime()))
            .sort((a, b) => a.getTime() - b.getTime());
          
          if (treasuryDates.length > 0) {
            selectedStart = treasuryDates[0];
            selectedEnd = treasuryDates[treasuryDates.length - 1];
          } else {
            selectedStart = new Date();
            selectedEnd = new Date();
          }
        } else {
          selectedStart = new Date();
          selectedEnd = new Date();
        }
      }
    } else {
      // Dates not set yet, compute from data (this happens before useEffect runs)
      if (treasuryData.length > 0) {
        const treasuryDates = treasuryData
          .map(d => new Date(d.date))
          .filter(d => !isNaN(d.getTime()))
          .sort((a, b) => a.getTime() - b.getTime());
        
        if (treasuryDates.length > 0) {
          selectedStart = treasuryDates[0];
          selectedEnd = treasuryDates[treasuryDates.length - 1];
        } else {
          // All dates were invalid, use current date
          selectedStart = new Date();
          selectedEnd = new Date();
        }
      } else {
        selectedStart = new Date();
        selectedEnd = new Date();
      }
    }
  }
  
  // Ensure dates are valid (fallback to computed dates from data if invalid)
  if (isNaN(selectedStart.getTime())) {
    // Fallback: compute from treasuryData if available, otherwise use today
    if (treasuryData.length > 0) {
      const treasuryDates = treasuryData
        .map(d => new Date(d.date))
        .filter(d => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());
      
      if (treasuryDates.length > 0) {
        selectedStart = treasuryDates[0];
      } else {
        selectedStart = new Date();
      }
    } else {
      selectedStart = new Date();
    }
  }
  if (isNaN(selectedEnd.getTime())) {
    // Fallback: compute from treasuryData if available, otherwise use today
    if (treasuryData.length > 0) {
      const treasuryDates = treasuryData
        .map(d => new Date(d.date))
        .filter(d => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());
      
      if (treasuryDates.length > 0) {
        selectedEnd = treasuryDates[treasuryDates.length - 1];
      } else {
        selectedEnd = new Date();
      }
    } else {
      selectedEnd = new Date();
    }
  }
  
  // Ensure selectedEnd is not before selectedStart
  if (selectedEnd < selectedStart) {
    console.warn('Component: selectedEnd is before selectedStart, swapping them');
    [selectedStart, selectedEnd] = [selectedEnd, selectedStart];
  }
  
  // Final safety check: ensure dates are valid before any operations
  const isValidStart = !isNaN(selectedStart.getTime());
  const isValidEnd = !isNaN(selectedEnd.getTime());
  
  if (!isValidStart || !isValidEnd) {
    // Last resort: use current date if still invalid
    if (!isValidStart) {
      selectedStart = new Date();
    }
    if (!isValidEnd) {
      selectedEnd = new Date();
    }
    console.warn('Component: Invalid date range detected, using fallback dates');
  }
  
  // Final validation before logging (double-check dates are valid)
  // If somehow dates are still invalid, use current date as absolute fallback
  if (isNaN(selectedStart.getTime())) {
    selectedStart = new Date();
  }
  if (isNaN(selectedEnd.getTime())) {
    selectedEnd = new Date();
  }
  
  // Log the final selected range (using safe formatting that never throws, and only in non-test environments)
  safeLog('Component: Final selected range:', safeFormatDateForLog(selectedStart), 'to', safeFormatDateForLog(selectedEnd));
  
  const businessDays = getBusinessDaysInRange(selectedStart, selectedEnd);

  // Create a map of corporate yields with their dates
  // Process all corporate data points first (including those on weekends/holidays)
  // then forward-fill business days with the most recent value
  const corporateYieldMap = new Map<string, number>();
  let lastKnownCorporateYield: number | null = null;

  // Get all corporate data points up to the end date (including data before selectedStart for forward-filling)
  // This allows us to use data from before the start date to forward-fill the first month
  const filteredCorporateData = corporateData
    .filter(d => {
      const date = new Date(d.date);
      return date <= selectedEnd; // Include data before selectedStart for forward-filling continuity
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Fill in all business days with forward-filled values
  // For each business day, use the most recent corporate data point that's <= that date
  businessDays.forEach(businessDay => {
    const dateStr = businessDay.toISOString().split('T')[0];
    const businessDayTime = businessDay.getTime();
    
    // Find the most recent corporate data point that's <= this business day
    let mostRecentDataPoint = null;
    for (let i = filteredCorporateData.length - 1; i >= 0; i--) {
      const dataPointDate = new Date(filteredCorporateData[i].date).getTime();
      if (dataPointDate <= businessDayTime && filteredCorporateData[i].yield > 0) {
        mostRecentDataPoint = filteredCorporateData[i];
        break;
      }
    }
    
    if (mostRecentDataPoint) {
      corporateYieldMap.set(dateStr, mostRecentDataPoint.yield);
      lastKnownCorporateYield = mostRecentDataPoint.yield;
    } else if (lastKnownCorporateYield !== null) {
      // Fallback to last known value if no data point found (for continuity)
      corporateYieldMap.set(dateStr, lastKnownCorporateYield);
    }
  });

  // Create a map of treasury yields with forward-filling logic
  const treasuryYieldMap = new Map<string, number>();
  let lastKnownTreasuryYield: number | null = null;

  // Get all treasury data points up to the end date (including data before selectedStart for forward-filling)
  // This allows us to use data from before the start date to forward-fill the first month
  const treasuryDataForFilling = treasuryData.filter(d => {
    const date = new Date(d.date);
    return date <= selectedEnd; // Include data before selectedStart for forward-filling continuity
  });
  
  // Initialize with the first valid treasury yield (from all data up to end date)
  if (treasuryDataForFilling.length > 0) {
    const sortedTreasury = treasuryDataForFilling.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    lastKnownTreasuryYield = sortedTreasury[0].yield;
  }

  // Fill in all business days with interpolated values for treasury yields
  businessDays.forEach(date => {
    const dateStr = date.toISOString().split('T')[0];
    // Look in all treasury data (including before selectedStart) for forward-filling
    const actualDataPoint = treasuryDataForFilling.find(d => d.date === dateStr);
    if (actualDataPoint && actualDataPoint.yield !== null) {
      treasuryYieldMap.set(dateStr, actualDataPoint.yield);
      lastKnownTreasuryYield = actualDataPoint.yield;
    } else if (lastKnownTreasuryYield !== null) {
      treasuryYieldMap.set(dateStr, lastKnownTreasuryYield);
    }
  });

  // Calculate latest values from data WITHIN the selected date range
  // This ensures the latest values reflect what's shown on the chart
  // IMPORTANT: Find the most recent date that has BOTH Treasury and Corporate data within the range
  // to ensure the spread is calculated from yields on the same date
  
  // Filter data to only include points within the selected range (for chart display)
  // But also keep the full dataset available for fallback
  const treasuryDataInRange = treasuryData.filter(d => {
    const date = new Date(d.date);
    return date >= selectedStart && date <= selectedEnd;
  });
  
  const corporateDataInRange = corporateData.filter(d => {
    const date = new Date(d.date);
    return date >= selectedStart && date <= selectedEnd;
  });
  
  // Create a map of dates that have both Treasury and Corporate data (within range)
  const datesWithBothData = new Set<string>();
  treasuryDataInRange.forEach(t => {
    if (corporateDataInRange.some(c => c.date === t.date)) {
      datesWithBothData.add(t.date);
    }
  });
  
  // Find the most recent date with both Treasury and Corporate data (within range)
  let latestDateWithBoth: string | null = null;
  if (datesWithBothData.size > 0) {
    const sortedDates = Array.from(datesWithBothData).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
    latestDateWithBoth = sortedDates[0];
    console.log('Component: Latest date with both Treasury and Corporate data (within range):', latestDateWithBoth);
    console.log('Component: Total dates with both data (within range):', datesWithBothData.size);
  } else {
    console.warn('Component: No dates found with both Treasury and Corporate data within selected range');
  }
  
  // Get the latest Treasury and Corporate yields from data within the selected range only
  // Don't fall back to data outside the range - if no data in range, show N/A
  const latestTreasury = treasuryDataInRange.length > 0 
    ? treasuryDataInRange.reduce((latest, current) => 
        new Date(current.date) > new Date(latest.date) ? current : latest
      )
    : null;
  
  const latestCorporate = corporateDataInRange.length > 0
    ? corporateDataInRange.reduce((latest, current) => 
        new Date(current.date) > new Date(latest.date) ? current : latest
      )
    : null;
  
  // Note: We'll use the forward-filled values from the yield maps below to match what's shown on the chart

  console.log('Component: Latest Treasury data point (within range):', latestTreasury?.date, latestTreasury?.yield);
  console.log('Component: Latest Corporate data point (within range):', latestCorporate?.date, latestCorporate?.yield);
  // Log selected range (using safe formatting)
  console.log('Component: Selected range:', safeFormatDateForLog(selectedStart), 'to', safeFormatDateForLog(selectedEnd));
  console.log('Component: Treasury data in range:', treasuryDataInRange.length, 'of', treasuryData.length);
  console.log('Component: Corporate data in range:', corporateDataInRange.length, 'of', corporateData.length);

  // Determine the display date and yields
  // Use the actual latest data points (not forward-filled values) for the latest yield display
  // This ensures we show the most recent actual data point, not an interpolated value
  const treasuryYieldForDisplay = latestTreasury?.yield ?? null;
  const corporateYieldForDisplay = latestCorporate?.yield ?? null;
  
  // Calculate spread as simple difference between the latest Treasury and Corporate yields shown in the boxes
  // Spread = Corporate Yield - Treasury Yield (converted to basis points)
  let spreadYield: number | null = null;
  if (treasuryYieldForDisplay !== null && corporateYieldForDisplay !== null) {
    spreadYield = (corporateYieldForDisplay - treasuryYieldForDisplay) * 100; // Convert to basis points
  }
  
  // For display date, use the end of the selected range (or the latest data within range if earlier)
  // This ensures all boxes show dates that are consistent with the chart
  const rangeEndDateStr = !isNaN(selectedEnd.getTime()) ? selectedEnd.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  let latestDate: string | null = null;
  
  // Use the most recent date within range, but cap it at the selected end date
  if (latestTreasury && latestCorporate) {
    const mostRecentInRange = new Date(latestTreasury.date) > new Date(latestCorporate.date)
      ? latestTreasury.date
      : latestCorporate.date;
    // Use the earlier of: most recent data in range, or the selected end date
    latestDate = new Date(mostRecentInRange) > selectedEnd ? rangeEndDateStr : mostRecentInRange;
  } else if (latestTreasury) {
    latestDate = new Date(latestTreasury.date) > selectedEnd ? rangeEndDateStr : latestTreasury.date;
  } else if (latestCorporate) {
    latestDate = new Date(latestCorporate.date) > selectedEnd ? rangeEndDateStr : latestCorporate.date;
  } else if (latestDateWithBoth) {
    latestDate = new Date(latestDateWithBoth) > selectedEnd ? rangeEndDateStr : latestDateWithBoth;
  } else {
    latestDate = rangeEndDateStr;
  }

  // Determine individual dates for Treasury and Corporate
  // Dates should be within the selected range (between selectedStart and selectedEnd)
  const rangeStartDateStr = !isNaN(selectedStart.getTime()) ? selectedStart.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  
  let treasuryDisplayDate: string | null = null;
  if (latestTreasury?.date) {
    const treasuryDate = new Date(latestTreasury.date);
    if (treasuryDate < selectedStart) {
      // Data point is before the range, show the start of the range
      treasuryDisplayDate = rangeStartDateStr;
    } else if (treasuryDate > selectedEnd) {
      // Data point is after the range, show the end of the range
      treasuryDisplayDate = rangeEndDateStr;
    } else {
      // Data point is within the range, show its actual date
      treasuryDisplayDate = latestTreasury.date;
    }
  } else {
    treasuryDisplayDate = rangeEndDateStr;
  }
  
  let corporateDisplayDate: string | null = null;
  if (latestCorporate?.date) {
    const corporateDate = new Date(latestCorporate.date);
    if (corporateDate < selectedStart) {
      // Data point is before the range, show the start of the range
      corporateDisplayDate = rangeStartDateStr;
    } else if (corporateDate > selectedEnd) {
      // Data point is after the range, show the end of the range
      corporateDisplayDate = rangeEndDateStr;
    } else {
      // Data point is within the range, show its actual date
      corporateDisplayDate = latestCorporate.date;
    }
  } else {
    corporateDisplayDate = rangeEndDateStr;
  }

  // Spread display date should match the greater (more recent) of the Treasury and Corporate dates
  let spreadDisplayDate: string | null = null;
  if (treasuryDisplayDate && corporateDisplayDate) {
    spreadDisplayDate = new Date(treasuryDisplayDate) > new Date(corporateDisplayDate)
      ? treasuryDisplayDate
      : corporateDisplayDate;
  } else if (treasuryDisplayDate) {
    spreadDisplayDate = treasuryDisplayDate;
  } else if (corporateDisplayDate) {
    spreadDisplayDate = corporateDisplayDate;
  } else {
    spreadDisplayDate = rangeEndDateStr;
  }

  // Create the latest data point with individual dates for each yield
  const latestData = {
    date: latestDate, // Overall most recent date (for backward compatibility)
    treasury_yield: treasuryYieldForDisplay,
    treasury_date: treasuryDisplayDate, // Treasury's date (capped at range end)
    corporate_yield: corporateYieldForDisplay,
    corporate_date: corporateDisplayDate, // Corporate's date (capped at range end)
    spread_yield: spreadYield,
    spread_date: spreadDisplayDate // Spread's display date (capped at range end)
  };
  
  console.log('Component: Final latestData:', latestData);
  console.log('Component: Treasury date:', latestTreasury?.date);
  console.log('Component: Corporate date:', latestCorporate?.date);
  console.log('Component: Spread calculation date (most recent with both):', latestDateWithBoth);
  console.log('Component: Spread display date (greater of treasury/corporate):', spreadDisplayDate);

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
              {latestData && latestData.treasury_yield !== null && latestData.treasury_yield !== undefined
                ? `${latestData.treasury_yield.toFixed(2)}%`
                : 'N/A'}
            </p>
            <p className="text-xs text-indigo-600">
              as of {latestData && latestData.treasury_date ? formatDisplayDate(latestData.treasury_date) : 'N/A'}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-green-50">
            <h4 className="text-sm font-medium text-green-900 mb-1">Corporate Yield</h4>
            <p className="text-2xl font-bold text-green-700 mb-1">
              {latestData && latestData.corporate_yield !== null && latestData.corporate_yield !== undefined
                ? `${latestData.corporate_yield.toFixed(2)}%`
                : 'N/A'}
            </p>
            <p className="text-xs text-green-600">
              as of {latestData && latestData.corporate_date ? formatDisplayDate(latestData.corporate_date) : 'N/A'}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-red-50">
            <h4 className="text-sm font-medium text-red-900 mb-1">Spread</h4>
            <p className="text-2xl font-bold text-red-700 mb-1">
              {latestData && latestData.spread_yield !== null && latestData.spread_yield !== undefined
                ? `${latestData.spread_yield.toFixed(0)} bps`
                : 'N/A'}
            </p>
            <p className="text-xs text-red-600">
              as of {latestData && latestData.spread_date ? formatDisplayDate(latestData.spread_date) : 'N/A'}
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