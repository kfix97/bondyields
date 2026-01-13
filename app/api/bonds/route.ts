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
    const startDate = startParam || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);
    
    // Get Treasury data using the selected series
    const fredUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${treasurySeries}&api_key=${FRED_API_KEY}&file_type=json&sort_order=asc&observation_start=${startDate}&observation_end=${endDate}`;
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

    // Get corporate bond data using the provided series
    const corporateUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${corporateSeries}&api_key=${FRED_API_KEY}&file_type=json&sort_order=asc&observation_start=${startDate}&observation_end=${endDate}`;
    console.log('FRED Corporate URL:', corporateUrl.replace(FRED_API_KEY || '', 'HIDDEN_KEY'));
    
    const corporateResponse = await axios.get<{ observations: FREDObservation[] }>(corporateUrl);
    console.log('FRED Corporate API Response Status:', corporateResponse.status);

    if (!corporateResponse.data.observations) {
      throw new Error('No observations found in FRED response for Corporate data');
    }

    const corporateData = corporateResponse.data.observations.map((item: FREDObservation): BondDataPoint => ({
      date: item.date,
      yield: parseFloat(item.value) || null,
      source: 'Corporate'
    })).filter((item): item is BondDataPoint => item.yield !== null);

    // Fetch the absolute latest data points (without date restrictions) to ensure we always have the most recent values
    const latestTreasuryUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${treasurySeries}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1`;
    const latestCorporateUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${corporateSeries}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1`;
    
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
        }
      }
    } catch (error) {
      console.warn('Failed to fetch absolute latest Treasury data:', error);
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
        }
      }
    } catch (error) {
      console.warn('Failed to fetch absolute latest Corporate data:', error);
    }

    // Combine both datasets for chart data
    const chartData = [...fredData, ...corporateData];
    
    // Add the absolute latest data points if they're not already in the chartData
    if (absoluteLatestTreasury) {
      const exists = chartData.some(d => d.date === absoluteLatestTreasury!.date && d.source === 'Treasury');
      if (!exists) {
        chartData.push(absoluteLatestTreasury);
      }
    }
    
    if (absoluteLatestCorporate) {
      const exists = chartData.some(d => d.date === absoluteLatestCorporate!.date && d.source === 'Corporate');
      if (!exists) {
        chartData.push(absoluteLatestCorporate);
      }
    }
    
    // Sort the combined data
    chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Format the response - use absolute latest if available, otherwise fall back to filtered latest
    const formattedResponse = {
      latestData: {
        treasury: absoluteLatestTreasury || (fredData.length > 0 ? fredData[fredData.length - 1] : null),
        corporate: absoluteLatestCorporate || (corporateData.length > 0 ? corporateData[corporateData.length - 1] : null)
      },
      chartData
    };

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

    if (error instanceof AxiosError) {
      console.error('Axios Error Details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url?.replace(FRED_API_KEY || '', 'HIDDEN_KEY'),
        method: error.config?.method
      });

      // Handle specific HTTP status codes
      if (error.response?.status === 403) {
        return NextResponse.json({
          status: 'error',
          message: 'FRED API access denied. Please check that FRED_API_KEY is set correctly in your environment variables.',
          errorType: 'AxiosError',
          httpStatus: 403,
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }

      if (error.response?.status === 400) {
        return NextResponse.json({
          status: 'error',
          message: 'Invalid request to FRED API. Please check the series IDs and date range.',
          errorType: 'AxiosError',
          httpStatus: 400,
          timestamp: new Date().toISOString()
        }, { status: 400 });
      }
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