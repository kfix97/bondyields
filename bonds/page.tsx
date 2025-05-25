import { Card, Title, Text, Grid, Metric, Flex } from '@tremor/react';
import { headers } from 'next/headers';
import BondChart from './BondChart';
import { ErrorBoundary } from './ErrorBoundary';

async function getBondData() {
  const headersList = headers();
  const host = headersList.get('host');
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  
  const res = await fetch(`${protocol}://${host}/api/bonds`, {
    next: { revalidate: 3600 } // Revalidate every hour
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch bond data');
  }

  const data = await res.json();
  console.log('Fetched data:', data);
  return data;
}

export default async function BondsPage() {
  const response = await getBondData();
  console.log('Full response:', response); 
  
  // Format the yield values with proper handling for null/undefined
  const treasuryYield = response?.latestData?.treasury?.yield !== undefined 
    ? `${response.latestData.treasury.yield.toFixed(2)}%`
    : 'N/A';
    
  const corporateYield = response?.latestData?.corporate?.yield !== undefined 
    ? `${response.latestData.corporate.yield.toFixed(2)}%`
    : 'N/A';

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-white">
      <main className="p-4 md:p-10 w-full max-w-7xl">
        <div className="text-center mb-8">
          <Title className="text-center text-gray-800 text-3xl mb-2">Bond Market Overview</Title>
          <Text className="text-gray-600 mb-6">Comparing Treasury and Corporate Bond Yields</Text>
          
          <div className="flex justify-center gap-12 mb-8">
            <div className="text-center">
              <Text className="text-gray-600 mb-1">Latest Treasury Yield</Text>
              <Metric className="text-gray-900">{treasuryYield}</Metric>
              {response?.latestData?.treasury?.date && (
                <Text className="text-sm text-gray-500 mt-1">
                  as of {new Date(response.latestData.treasury.date).toLocaleDateString()}
                </Text>
              )}
            </div>
            <div className="text-center">
              <Text className="text-gray-600 mb-1">Latest AAA Corporate Yield</Text>
              <Metric className="text-gray-900">{corporateYield}</Metric>
              {response?.latestData?.corporate?.date && (
                <Text className="text-sm text-gray-500 mt-1">
                  as of {new Date(response.latestData.corporate.date).toLocaleDateString()}
                </Text>
              )}
            </div>
          </div>
        </div>

        <Card className="bg-white shadow-md">
          <Title className="text-gray-800 text-center mb-2">Yield Comparison Over Time</Title>
          <Text className="text-gray-600 text-center mb-6">Treasury vs Corporate Bond Yields</Text>
          <div style={{ width: '100%', minHeight: '500px', background: 'white', padding: '20px' }}>
            <ErrorBoundary>
              <BondChart data={response?.chartData || []} />
            </ErrorBoundary>
          </div>
        </Card>
      </main>
    </div>
  );
} 