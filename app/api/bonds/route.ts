import { NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';

const FRED_API_KEY = process.env.FRED_API_KEY;

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
  try {
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
    
    // Calculate dates for one year range
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
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

    // Combine both datasets for chart data
    const chartData = [...fredData, ...corporateData].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Format the response
    const formattedResponse = {
      latestData: {
        treasury: fredData[fredData.length - 1], // Get the most recent data point
        corporate: corporateData[corporateData.length - 1]
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