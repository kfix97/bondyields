'use client';

import { Card, Title, Text, Grid, Metric, Flex } from '@tremor/react';
import BondChart from './components/BondChart';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useState, useEffect } from 'react';

// Series data for bond options
const seriesData = [
  { value: "AAA", name: "Moody's Seasoned Aaa Corporate Bond Yield" },
  { value: "BAMLC0A4CBBB", name: "ICE BofA BBB US Corporate Index Option-Adjusted Spread" },
  { value: "DBAA", name: "Moody's Seasoned Baa Corporate Bond Yield" },
  { value: "BAMLC0A0CM", name: "ICE BofA US Corporate Index Option-Adjusted Spread" },
  { value: "BAMLC0A4CBBBEY", name: "ICE BofA BBB US Corporate Index Effective Yield" },
  { value: "BAMLC0A1CAAAEY", name: "ICE BofA AAA US Corporate Index Effective Yield" },
  { value: "BAMLC0A0CMEY", name: "ICE BofA US Corporate Index Effective Yield" },
  { value: "BAMLC0A3CA", name: "ICE BofA Single-A US Corporate Index Option-Adjusted Spread" },
  { value: "BAMLC0A2CAAEY", name: "ICE BofA AA US Corporate Index Effective Yield" },
  { value: "HQMCB10YR", name: "10-Year High Quality Market (HQM) Corporate Bond Spot Rate" },
  { value: "BAMLC0A3CAEY", name: "ICE BofA Single-A US Corporate Index Effective Yield" },
  { value: "BAMLC0A2CAA", name: "ICE BofA AA US Corporate Index Option-Adjusted Spread" },
  { value: "BAMLC0A1CAAA", name: "ICE BofA AAA US Corporate Index Option-Adjusted Spread" },
  { value: "BAMLEMCBPIOAS", name: "ICE BofA Emerging Markets Corporate Plus Index Option-Adjusted Spread" },
  { value: "BAMLC4A0C710YEY", name: "ICE BofA 7-10 Year US Corporate Index Effective Yield" },
  { value: "HQMCB10YRP", name: "10-Year High Quality Market (HQM) Corporate Bond Par Yield" },
  { value: "BAMLEMHBHYCRPIOAS", name: "ICE BofA High Yield Emerging Markets Corporate Plus Index Option-Adjusted Spread" },
  { value: "HQMCB5YR", name: "5-Year High Quality Market (HQM) Corporate Bond Spot Rate" },
  { value: "BAMLC1A0C13YEY", name: "ICE BofA 1-3 Year US Corporate Index Effective Yield" },
  { value: "HQMCB20YR", name: "20-Year High Quality Market (HQM) Corporate Bond Spot Rate" },
  { value: "BAMLEMHBHYCRPIEY", name: "ICE BofA High Yield Emerging Markets Corporate Plus Index Effective Yield" },
  { value: "BAMLC2A0C35YEY", name: "ICE BofA 3-5 Year US Corporate Index Effective Yield" },
  { value: "BAMLC8A0C15PYEY", name: "ICE BofA 15+ Year US Corporate Index Effective Yield" },
  { value: "HQMCB2YRP", name: "2-Year High Quality Market (HQM) Corporate Bond Par Yield" },
  { value: "BAMLC3A0C57YEY", name: "ICE BofA 5-7 Year US Corporate Index Effective Yield" },
  { value: "HQMCB30YR", name: "30-Year High Quality Market (HQM) Corporate Bond Spot Rate" },
  { value: "HQMCB12YR", name: "12-Year High Quality Market (HQM) Corporate Bond Spot Rate" },
  { value: "HQMCB1YR", name: "1-Year High Quality Market (HQM) Corporate Bond Spot Rate" },
  { value: "HQMCB5YRP", name: "5-Year High Quality Market (HQM) Corporate Bond Par Yield" },
  { value: "BAMLEMCBPIEY", name: "ICE BofA Emerging Markets Corporate Plus Index Effective Yield" },
  { value: "BAMLC1A0C13Y", name: "ICE BofA 1-3 Year US Corporate Index Option-Adjusted Spread" },
  { value: "HQMCB15YR", name: "15-Year High Quality Market (HQM) Corporate Bond Spot Rate" },
  { value: "HQMCB100YR", name: "100-Year High Quality Market (HQM) Corporate Bond Spot Rate" },
  { value: "HQMCB30YRP", name: "30-Year High Quality Market (HQM) Corporate Bond Par Yield" },
  { value: "BAMLC2A0C35Y", name: "ICE BofA 3-5 Year US Corporate Index Option-Adjusted Spread" },
  { value: "BAMLC4A0C710Y", name: "ICE BofA 7-10 Year US Corporate Index Option-Adjusted Spread" },
  { value: "HQMCB3YR", name: "3-Year High Quality Market (HQM) Corporate Bond Spot Rate" },
  { value: "HQMCB50YR", name: "50-Year High Quality Market (HQM) Corporate Bond Spot Rate" },
  { value: "BAMLC7A0C1015YEY", name: "ICE BofA 10-15 Year US Corporate Index Effective Yield" },
  { value: "BAMLEMRACRPIASIAOAS", name: "ICE BofA Asia Emerging Markets Corporate Plus Index Option-Adjusted Spread" },
  { value: "BAMLEMRACRPIASIAEY", name: "ICE BofA Asia Emerging Markets Corporate Plus Index Effective Yield" },
  { value: "BAMLEM4BRRBLCRPIOAS", name: "ICE BofA B & Lower Emerging Markets Corporate Plus Index Option-Adjusted Spread" },
  { value: "BAMLEM2BRRBBBCRPIEY", name: "ICE BofA BBB Emerging Markets Corporate Plus Index Effective Yield" },
  { value: "BAMLEMPBPUBSICRPIEY", name: "ICE BofA Public Sector Issuers Emerging Markets Corporate Plus Index Effective Yield" },
  { value: "BAMLEM4RBLLCRPIUSEY", name: "ICE BofA B & Lower US Emerging Markets Liquid Corporate Plus Index Effective Yield" },
  { value: "HQMCB2YR", name: "2-Year High Quality Market (HQM) Corporate Bond Spot Rate" }
];

export default function BondsPage() {
  const [selectedSeries, setSelectedSeries] = useState(seriesData[0].value);
  const [bondData, setBondData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`/api/bonds?series=${selectedSeries}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch bond data');
        }

        const data = await response.json();
        setBondData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [selectedSeries]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // Format the yield values with proper handling for null/undefined
  const treasuryYield = bondData?.latestData?.treasury?.yield !== undefined 
    ? `${bondData.latestData.treasury.yield.toFixed(2)}%`
    : 'N/A';
    
  const corporateYield = bondData?.latestData?.corporate?.yield !== undefined 
    ? `${bondData.latestData.corporate.yield.toFixed(2)}%`
    : 'N/A';

  return (
    <div className="flex flex-col items-center min-h-screen bg-white">
      <main className="w-full max-w-7xl pt-10">
        <div className="text-center">
          <Title className="text-center text-gray-800 text-3xl mb-2">Bond Market Overview</Title>
          <Text className="text-gray-600">Comparing Treasury and Corporate Bond Yields</Text>
        </div>

        {/* Bond Series Selection */}
        <div className="w-full max-w-2xl mx-auto my-6">
          <Text className="text-gray-600">Select a corporate series to compare:</Text>
          <select
            value={selectedSeries}
            onChange={(e) => setSelectedSeries(e.target.value)}
            className="block w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {seriesData.map((series) => (
              <option key={series.value} value={series.value}>
                {series.name}
              </option>
            ))}
          </select>
        </div>

        <Card className="bg-white shadow-md">
          <div style={{ width: '100%', minHeight: '500px', background: 'white' }}>
            <ErrorBoundary>
              <BondChart data={bondData?.chartData || []} />
            </ErrorBoundary>
          </div>
        </Card>
      </main>
    </div>
  );
}
