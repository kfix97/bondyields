'use client';

import { Card, Title, Text } from '@tremor/react';
import BondChart from './components/BondChart';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useState, useEffect, useRef } from 'react';

// Series data for corporate bond options
const corporateSeriesData = [
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

// Series data for treasury options
const treasurySeriesData = [
  { value: "DGS10", name: "Market Yield on U.S. Treasury Securities at 10-Year Constant Maturity, Quoted on an Investment Basis" },
  { value: "DFII10", name: "Market Yield on U.S. Treasury Securities at 10-Year Constant Maturity, Quoted on an Investment Basis, Inflation-Indexed" },
  { value: "DGS1", name: "Market Yield on U.S. Treasury Securities at 1-Year Constant Maturity, Quoted on an Investment Basis" },
  { value: "DGS2", name: "Market Yield on U.S. Treasury Securities at 2-Year Constant Maturity, Quoted on an Investment Basis" },
  { value: "DGS5", name: "Market Yield on U.S. Treasury Securities at 5-Year Constant Maturity, Quoted on an Investment Basis" },
  { value: "DGS30", name: "Market Yield on U.S. Treasury Securities at 30-Year Constant Maturity, Quoted on an Investment Basis" },
  { value: "DGS20", name: "Market Yield on U.S. Treasury Securities at 20-Year Constant Maturity, Quoted on an Investment Basis" },
  { value: "DGS3MO", name: "Market Yield on U.S. Treasury Securities at 3-Month Constant Maturity, Quoted on an Investment Basis" },
  { value: "DGS1MO", name: "Market Yield on U.S. Treasury Securities at 1-Month Constant Maturity, Quoted on an Investment Basis" },
  { value: "DFII5", name: "Market Yield on U.S. Treasury Securities at 5-Year Constant Maturity, Quoted on an Investment Basis, Inflation-Indexed" },
  { value: "DGS3", name: "Market Yield on U.S. Treasury Securities at 3-Year Constant Maturity, Quoted on an Investment Basis" },
  { value: "DGS6MO", name: "Market Yield on U.S. Treasury Securities at 6-Month Constant Maturity, Quoted on an Investment Basis" },
  { value: "DGS7", name: "Market Yield on U.S. Treasury Securities at 7-Year Constant Maturity, Quoted on an Investment Basis" }
];

// Utility to check if a string is a valid ISO date (yyyy-mm-dd)
function isValidISODate(dateStr: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime()) && dateStr === date.toISOString().split('T')[0];
}

export default function BondsPage() {
  const [selectedCorporateSeries, setSelectedCorporateSeries] = useState(corporateSeriesData[0].value);
  const [selectedTreasurySeries, setSelectedTreasurySeries] = useState(treasurySeriesData[0].value);
  const [bondData, setBondData] = useState<{
    status: string;
    message: string;
    latestData: {
      treasury: {
        date: string;
        yield: number;
        source: string;
      };
      corporate: {
        date: string;
        yield: number;
        source: string;
      };
    };
    chartData: Array<{
      date: string;
      yield: number;
      source: string;
    }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range state
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  const defaultStart = oneYearAgo.toISOString().split('T')[0];
  const defaultEnd = today.toISOString().split('T')[0];
  const minAllowedDate = '1600-01-01';
  const maxAllowedDate = defaultEnd;
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [dateError, setDateError] = useState<string | null>(null);

  // Validate date range
  useEffect(() => {
    if (!isValidISODate(startDate)) {
      setDateError('Start date is invalid. Please enter a valid date (YYYY-MM-DD).');
    } else if (!isValidISODate(endDate)) {
      setDateError('End date is invalid. Please enter a valid date (YYYY-MM-DD).');
    } else if (startDate < minAllowedDate || startDate > maxAllowedDate) {
      setDateError(`Start date must be between ${minAllowedDate} and ${maxAllowedDate}.`);
    } else if (endDate < minAllowedDate || endDate > maxAllowedDate) {
      setDateError(`End date must be between ${minAllowedDate} and ${maxAllowedDate}.`);
    } else if (new Date(startDate) > new Date(endDate)) {
      setDateError('Start date must be before end date.');
    } else {
      setDateError(null);
    }
  }, [startDate, endDate]);

  // Debounced fetch effect for date range and series changes
  useEffect(() => {
    if (dateError) return;
    const handler = setTimeout(() => {
      const fetchData = async () => {
        try {
          setIsLoading(true);
          setError(null);
          const queryParams = new URLSearchParams({
            series: selectedCorporateSeries,
            treasury: selectedTreasurySeries,
            start: startDate,
            end: endDate
          });
          const response = await fetch(`/api/bonds?${queryParams.toString()}`);
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
    }, 500); // 500ms debounce
    return () => clearTimeout(handler);
  }, [selectedCorporateSeries, selectedTreasurySeries, startDate, endDate, dateError]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-white">
      <main className="w-full max-w-7xl pt-10">
        <div className="text-center">
          <Title className="text-center text-gray-800 text-3xl mb-2">Bond Yield Spreads</Title>
          <div className="flex items-center justify-center gap-2">
            <Text className="text-gray-600">Comparing Treasury and Corporate Yields</Text>
            <div className="group relative inline-block">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-gray-500 cursor-help"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                />
              </svg>
              <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-300 absolute z-10 w-96 p-4 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg text-left text-sm text-gray-600 -translate-x-1/2 left-1/2">
                <p className="mb-2">
                  The spread between corporate and Treasury bond yields represents the credit risk premium investors demand to hold corporate bonds over &apos;risk-free&apos; government bonds.
                </p>
                <p className="mb-2">
                  Treasury yields reflect the baseline cost of capital (risk-free rate), while corporate bond yields include additional compensation for default risk, liquidity, and other factors.
                </p>
                <p>
                  A widening spread typically signals increased market concern about corporate creditworthiness (e.g., during recessions), while a narrowing spread can indicate improving investor confidence.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bond Series Selection */}
        <div className="w-full max-w-6xl mx-auto my-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="treasury-select" className="block text-sm font-medium text-gray-700 mb-2">
                Treasury Series
              </label>
              <select
                id="treasury-select"
                value={selectedTreasurySeries}
                onChange={(e) => setSelectedTreasurySeries(e.target.value)}
                className="block w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {treasurySeriesData.map((series) => (
                  <option key={series.value} value={series.value}>
                    {series.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="corporate-select" className="block text-sm font-medium text-gray-700 mb-2">
                Corporate Series
              </label>
              <select
                id="corporate-select"
                value={selectedCorporateSeries}
                onChange={(e) => setSelectedCorporateSeries(e.target.value)}
                className="block w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {corporateSeriesData.map((series) => (
                  <option key={series.value} value={series.value}>
                    {series.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Date Range Selection */}
        <div className="w-full max-w-6xl mx-auto my-6 flex flex-col md:flex-row items-center gap-4">
          <label className="flex flex-col text-sm font-medium">
            Start Date
            <input
              type="date"
              value={startDate}
              max={endDate}
              min={minAllowedDate}
              onChange={e => setStartDate(e.target.value)}
              className="border rounded px-2 py-1 mt-1"
            />
          </label>
          <span className="mx-2">to</span>
          <label className="flex flex-col text-sm font-medium">
            End Date
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={maxAllowedDate}
              onChange={e => setEndDate(e.target.value)}
              className="border rounded px-2 py-1 mt-1"
            />
          </label>
          {dateError && <div className="text-red-600 text-sm mb-2">{dateError}</div>}
        </div>

        <Card className="bg-white shadow-md">
          <div style={{ width: '100%', minHeight: '500px', background: 'white' }}>
            <ErrorBoundary>
              <BondChart data={bondData?.chartData || []} disableDateFilter />
            </ErrorBoundary>
          </div>
        </Card>
      </main>
    </div>
  );
}
