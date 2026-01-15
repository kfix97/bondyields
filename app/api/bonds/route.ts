import { NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';

interface FREDObservation {
  date: string;
  value: string;
}

interface BondDataPoint {
  date: string;
  yield: number | null;
  source: string;
}

export async function GET(request: Request) {
  // Read FRED API key from environment (read at runtime to support tests)
  const FRED_API_KEY = process.env.FRED_API_KEY;
  
  try {
    // Check if FRED API key is configured
    if (!FRED_API_KEY) {
      console.error('FRED_API_KEY is not configured');
      return NextResponse.json({
        status: 'error',
        message: 'FRED API key is not configured. Please set FRED_API_KEY environment variable.',
        errorType: 'ConfigurationError',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const corporateSeries = searchParams.get('series');
    const treasurySeries = searchParams.get('treasury');

    if (!corporateSeries || !treasurySeries) {
      return NextResponse.json({ 
        error: 'Both series and treasury parameters are required' 
      }, { status: 400 });
    }

    console.log('API route called - Starting FRED API request');
    console.log('Corporate Series:', corporateSeries);
    console.log('Treasury Series:', treasurySeries);
    
    // Calculate dates for one year range or use query params
    const endParam = searchParams.get('end');
    const startParam = searchParams.get('start');
    const endDate = endParam || new Date().toISOString().split('T')[0];
    const requestedStartDate = startParam || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Fetch one additional month before the requested start date to enable forward-filling
    // for the first month of data in the chart
    // Parse the date string to avoid timezone issues and handle month boundaries correctly
    const [year, month, day] = requestedStartDate.split('-').map(Number);
    let prevYear = year;
    let prevMonth = month - 1;
    
    // Handle year rollover (January -> December of previous year)
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear = year - 1;
    }
    
    // Calculate the last day of the previous month to handle cases like March 31 -> February 28
    // Day 0 of a month gives us the last day of the previous month
    const lastDayOfPrevMonth = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
    const targetDay = Math.min(day, lastDayOfPrevMonth);
    const fetchStartDateObj = new Date(Date.UTC(prevYear, prevMonth - 1, targetDay)); // month is 0-indexed
    const fetchStartDate = fetchStartDateObj.toISOString().split('T')[0];
    const startDate = requestedStartDate; // Keep original startDate for filtering later

    console.log('Requested Start Date:', startDate);
    console.log('Fetch Start Date (1 month earlier for continuity):', fetchStartDate);
    console.log('End Date:', endDate);
    
    // Get Treasury data using the selected series (fetch from 1 month earlier)
    const fredUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${treasurySeries}&api_key=${FRED_API_KEY}&file_type=json&sort_order=asc&observation_start=${fetchStartDate}&observation_end=${endDate}`;
    console.log('FRED Treasury URL:', fredUrl.replace(FRED_API_KEY || '', 'HIDDEN_KEY'));
    
    const fredResponse = await axios.get<{ observations: FREDObservation[] }>(fredUrl);
    console.log('FRED Treasury API Response Status:', fredResponse.status);

    if (!fredResponse.data.observations) {
      throw new Error('No observations found in FRED response for Treasury data');
    }

    const fredData = fredResponse.data.observations.map((item: FREDObservation): BondDataPoint => ({
      date: item.date,
      yield: parseFloat(item.value) || null, // Handle 'ND' (no data) values
      source: 'Treasury'
    })).filter((item): item is BondDataPoint => item.yield !== null); // Remove null values

    // Get corporate bond data using the provided series (fetch from 1 month earlier)
    const corporateUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${corporateSeries}&api_key=${FRED_API_KEY}&file_type=json&sort_order=asc&observation_start=${fetchStartDate}&observation_end=${endDate}`;
    console.log('FRED Corporate URL:', corporateUrl.replace(FRED_API_KEY || '', 'HIDDEN_KEY'));
    
    const corporateResponse = await axios.get<{ observations: FREDObservation[] }>(corporateUrl);
    console.log('FRED Corporate API Response Status:', corporateResponse.status);
    console.log('FRED Corporate API - Total observations received:', corporateResponse.data.observations?.length || 0);

    if (!corporateResponse.data.observations) {
      throw new Error('No observations found in FRED response for Corporate data');
    }

    // Log the last few raw observations from FRED (before filtering)
    if (corporateResponse.data.observations.length > 0) {
      const lastFewRaw = corporateResponse.data.observations.slice(-5);
      console.log('Last 5 raw FRED corporate observations (before filtering):');
      lastFewRaw.forEach(obs => {
        console.log(`  Date: ${obs.date}, Raw Value: ${obs.value}`);
      });
    }

    const corporateData = corporateResponse.data.observations.map((item: FREDObservation): BondDataPoint => ({
      date: item.date,
      yield: parseFloat(item.value) || null,
      source: 'Corporate'
    })).filter((item): item is BondDataPoint => item.yield !== null);

    // Log the last few corporate data points from the date-range query
    if (corporateData.length > 0) {
      const lastFew = corporateData.slice(-5);
      console.log('Last 5 corporate data points from date-range query:');
      lastFew.forEach(point => {
        console.log(`  Date: ${point.date}, Yield: ${point.yield}`);
      });
    }

    // Fetch the absolute latest data points (without date restrictions) to ensure we always have the most recent values
    // Use today's date as observation_end to ensure we get the most recent available data
    const today = new Date().toISOString().split('T')[0];
    const latestTreasuryUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${treasurySeries}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1&observation_end=${today}`;
    const latestCorporateUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${corporateSeries}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1&observation_end=${today}`;
    
    let absoluteLatestTreasury: BondDataPoint | null = null;
    let absoluteLatestCorporate: BondDataPoint | null = null;
    
    try {
      const latestTreasuryResponse = await axios.get<{ observations: FREDObservation[] }>(latestTreasuryUrl);
      if (latestTreasuryResponse.data.observations && latestTreasuryResponse.data.observations.length > 0) {
        const latest = latestTreasuryResponse.data.observations[0];
        const yieldValue = parseFloat(latest.value);
        if (!isNaN(yieldValue)) {
          absoluteLatestTreasury = {
            date: latest.date,
            yield: yieldValue,
            source: 'Treasury'
          };
          console.log('Absolute latest Treasury data:', absoluteLatestTreasury.date, absoluteLatestTreasury.yield);
        } else {
          console.warn('Latest Treasury data has invalid yield value:', latest.value);
        }
      } else {
        console.warn('No observations returned for latest Treasury data');
      }
    } catch (error) {
      console.error('Failed to fetch absolute latest Treasury data:', error);
    }
    
    try {
      const latestCorporateResponse = await axios.get<{ observations: FREDObservation[] }>(latestCorporateUrl);
      if (latestCorporateResponse.data.observations && latestCorporateResponse.data.observations.length > 0) {
        const latest = latestCorporateResponse.data.observations[0];
        const yieldValue = parseFloat(latest.value);
        if (!isNaN(yieldValue)) {
          absoluteLatestCorporate = {
            date: latest.date,
            yield: yieldValue,
            source: 'Corporate'
          };
          console.log('Absolute latest Corporate data:', absoluteLatestCorporate.date, absoluteLatestCorporate.yield);
        } else {
          console.warn('Latest Corporate data has invalid yield value:', latest.value);
        }
      } else {
        console.warn('No observations returned for latest Corporate data');
      }
    } catch (error) {
      console.error('Failed to fetch absolute latest Corporate data:', error);
    }

    // Combine both datasets for chart data
    const chartData = [...fredData, ...corporateData];
    
    // Add the absolute latest data points if they're not already in the chartData
    if (absoluteLatestTreasury) {
      const exists = chartData.some(d => d.date === absoluteLatestTreasury!.date && d.source === 'Treasury');
      if (!exists) {
        chartData.push(absoluteLatestTreasury);
        console.log('Added absolute latest Treasury data to chartData:', absoluteLatestTreasury.date);
      } else {
        console.log('Absolute latest Treasury data already exists in chartData:', absoluteLatestTreasury.date);
      }
    } else {
      console.warn('No absolute latest Treasury data available');
    }
    
    if (absoluteLatestCorporate) {
      const exists = chartData.some(d => d.date === absoluteLatestCorporate!.date && d.source === 'Corporate');
      if (!exists) {
        chartData.push(absoluteLatestCorporate);
        console.log('Added absolute latest Corporate data to chartData:', absoluteLatestCorporate.date);
      } else {
        console.log('Absolute latest Corporate data already exists in chartData:', absoluteLatestCorporate.date);
      }
    } else {
      console.warn('No absolute latest Corporate data available');
    }
    
    // Sort the combined data
    chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Log the date range of chartData for debugging
    if (chartData.length > 0) {
      const dates = chartData.map(d => d.date).sort();
      console.log('ChartData date range:', dates[0], 'to', dates[dates.length - 1]);
      console.log('Total data points in chartData:', chartData.length);
    }

    // Format the response - use absolute latest if available, otherwise fall back to filtered latest
    const formattedResponse = {
      latestData: {
        treasury: absoluteLatestTreasury || (fredData.length > 0 ? fredData[fredData.length - 1] : null),
        corporate: absoluteLatestCorporate || (corporateData.length > 0 ? corporateData[corporateData.length - 1] : null)
      },
      chartData
    };

    // Log what's being returned in latestData
    console.log('=== LATEST DATA BEING RETURNED ===');
    console.log('Latest Corporate Data:', formattedResponse.latestData.corporate ? {
      date: formattedResponse.latestData.corporate.date,
      yield: formattedResponse.latestData.corporate.yield,
      source: formattedResponse.latestData.corporate.source
    } : 'null');
    console.log('Latest Treasury Data:', formattedResponse.latestData.treasury ? {
      date: formattedResponse.latestData.treasury.date,
      yield: formattedResponse.latestData.treasury.yield,
      source: formattedResponse.latestData.treasury.source
    } : 'null');
    
    // Log the last few data points in chartData for corporate
    const corporateChartData = chartData.filter(d => d.source === 'Corporate').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (corporateChartData.length > 0) {
      const lastFewChart = corporateChartData.slice(-5);
      console.log('Last 5 corporate data points in chartData:');
      lastFewChart.forEach(point => {
        console.log(`  Date: ${point.date}, Yield: ${point.yield}`);
      });
    }
    console.log('==================================');

    console.log('Successfully processed bond data');

    return NextResponse.json({
      status: 'success',
      message: 'Data fetched successfully',
      ...formattedResponse
    });

  } catch (error) {
    console.error('API Error Details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Check for AxiosError using both instanceof and isAxiosError property
    // (isAxiosError property is needed for test environments where instanceof may fail)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isAxiosError = error instanceof AxiosError || (error as any)?.isAxiosError === true;
    
    if (isAxiosError) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const axiosError = error as any;
      console.error('Axios Error Details:', {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
        url: axiosError.config?.url?.replace(FRED_API_KEY || '', 'HIDDEN_KEY'),
        method: axiosError.config?.method
      });

      // Handle specific HTTP status codes
      if (axiosError.response?.status === 403) {
        return NextResponse.json({
          status: 'error',
          message: 'FRED API access denied. Please check that FRED_API_KEY is set correctly in your environment variables.',
          errorType: 'AxiosError',
          httpStatus: 403,
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }

      if (axiosError.response?.status === 400) {
        return NextResponse.json({
          status: 'error',
          message: 'Invalid request to FRED API. Please check the series IDs and date range.',
          errorType: 'AxiosError',
          httpStatus: 400,
          timestamp: new Date().toISOString()
        }, { status: 400 });
      }

      // For other AxiosErrors, return the error message with AxiosError type
      return NextResponse.json({
        status: 'error',
        message: axiosError.message || 'Request failed',
        errorType: 'AxiosError',
        httpStatus: axiosError.response?.status,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      errorType: error instanceof Error ? error.name : 'Unknown',
      timestamp: new Date().toISOString()
    }, { 
      status: 500 
    });
  }
} 