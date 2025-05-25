import { NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';

// Temporarily hardcoded for debugging
const FRED_API_KEY = process.env.FRED_API_KEY;

export async function GET() {
  try {
    console.log('API route called - Starting FRED API request');
    
    // Get 1 year of data, sorted ascending
    const fredUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=DGS10&api_key=${FRED_API_KEY}&file_type=json&sort_order=asc&limit=252`;
    console.log('FRED URL:', fredUrl);
    
    const fredResponse = await axios.get(fredUrl);
    console.log('FRED API Response Status:', fredResponse.status);
    console.log('FRED API Response Data Keys:', Object.keys(fredResponse.data));

    if (!fredResponse.data.observations) {
      throw new Error('No observations found in FRED response');
    }

    const fredData = fredResponse.data.observations.map((item: any) => ({
      date: item.date,
      yield: parseFloat(item.value),
      source: 'Treasury'
    }));

    // Format the response to match the expected structure
    const formattedResponse = {
      latestData: {
        treasury: fredData[fredData.length - 1], // Get the most recent data point
        corporate: null
      },
      chartData: fredData
    };

    console.log('Successfully processed FRED data, count:', fredData.length);

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
        url: error.config?.url,
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