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
  source: 'Treasury' | 'Corporate AAA';
}

export async function GET() {
  try {
    console.log('API route called - Starting FRED API request');
    
    // Calculate dates for one year range
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);
    
    
    // Get Treasury data
    const fredUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=DGS10&api_key=${FRED_API_KEY}&file_type=json&sort_order=asc&observation_start=${startDate}&observation_end=${endDate}`;
    console.log('FRED URL:', fredUrl.replace(FRED_API_KEY || '', 'HIDDEN_KEY'));
    
    const fredResponse = await axios.get<{ observations: FREDObservation[] }>(fredUrl);
    console.log('FRED API Response Status:', fredResponse.status);

    if (!fredResponse.data.observations) {
      throw new Error('No observations found in FRED response');
    }

    const fredData = fredResponse.data.observations.map((item: FREDObservation): BondDataPoint => ({
      date: item.date,
      yield: parseFloat(item.value) || null, // Handle 'ND' (no data) values
      source: 'Treasury'
    })).filter((item): item is BondDataPoint => item.yield !== null); // Remove null values

    // Get corporate bond data (AAA)
    const aaaUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=AAA&api_key=${FRED_API_KEY}&file_type=json&sort_order=asc&observation_start=${startDate}&observation_end=${endDate}`;
    const aaaResponse = await axios.get<{ observations: FREDObservation[] }>(aaaUrl);

    const aaaData = aaaResponse.data.observations.map((item: FREDObservation): BondDataPoint => ({
      date: item.date,
      yield: parseFloat(item.value) || null,
      source: 'Corporate AAA'
    })).filter((item): item is BondDataPoint => item.yield !== null);

    // Combine both datasets for chart data
    const chartData = [...fredData, ...aaaData].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Format the response
    const formattedResponse = {
      latestData: {
        treasury: fredData[fredData.length - 1], // Get the most recent data point
        corporate: aaaData[aaaData.length - 1]
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