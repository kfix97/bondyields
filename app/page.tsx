import { Card, Title, Text, Grid, Metric, Flex } from '@tremor/react';
import { headers } from 'next/headers';
import BondChart from './components/BondChart';
import { ErrorBoundary } from './components/ErrorBoundary';

async function getBondData() {
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  
  const res = await fetch(`${protocol}://${host}/api/bonds`);
  
  if (!res.ok) {
    throw new Error('Failed to fetch bond data');
  }

  const data = await res.json();
  return data;
}

export default async function BondsPage() {
  const response = await getBondData();
  
  // Format the yield values with proper handling for null/undefined
  const treasuryYield = response?.latestData?.treasury?.yield !== undefined 
    ? `${response.latestData.treasury.yield.toFixed(2)}%`
    : 'N/A';
    
  const corporateYield = response?.latestData?.corporate?.yield !== undefined 
    ? `${response.latestData.corporate.yield.toFixed(2)}%`
    : 'N/A';

  return (
    <div className="flex flex-col items-center min-h-screen bg-white">
      <main className="w-full max-w-7xl pt-10">
        <div className="text-center">
          <Title className="text-center text-gray-800 text-3xl mb-2">Bond Market Overview</Title>
          <Text className="text-gray-600">Comparing Treasury and Corporate Bond Yields</Text>
        </div>

        <Card className="bg-white shadow-md">
          <div style={{ width: '100%', minHeight: '500px', background: 'white' }}>
            <ErrorBoundary>
              <BondChart data={response?.chartData || []} />
            </ErrorBoundary>
          </div>
        </Card>
      </main>
    </div>
  );
}
