import React from 'react';
import { render, screen } from '@testing-library/react';
import Chart from '../Chart';

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

describe('Chart', () => {
  const mockData = [
    {
      date: '2023-01-01',
      formattedDate: '2023-01-01',
      treasury_yield: 3.5,
      corporate_yield: 4.5,
      spread_yield: 100,
    },
    {
      date: '2023-01-02',
      formattedDate: '2023-01-02',
      treasury_yield: 3.6,
      corporate_yield: 4.6,
      spread_yield: 100,
    },
  ];

  const defaultProps = {
    data: mockData,
    sources: ['Treasury', 'Corporate', 'Spread (Corporate - Treasury)'],
    colors: {
      'Treasury': '#4f46e5',
      'Corporate': '#16a34a',
      'Spread (Corporate - Treasury)': '#dc2626',
    },
    yieldKeys: {
      'Treasury': 'treasury_yield',
      'Corporate': 'corporate_yield',
      'Spread (Corporate - Treasury)': 'spread_yield',
    },
  };

  it('should render chart with all components', () => {
    render(<Chart {...defaultProps} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getAllByTestId('y-axis')).toHaveLength(2); // Two Y axes (yield and spread)
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });

  it('should render lines for all sources', () => {
    render(<Chart {...defaultProps} />);

    const lines = screen.getAllByTestId('line');
    expect(lines).toHaveLength(3); // Treasury, Corporate, Spread
  });

  it('should handle empty data array', () => {
    render(<Chart {...defaultProps} data={[]} />);

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('should handle data with null values', () => {
    const dataWithNulls = [
      {
        date: '2023-01-01',
        formattedDate: '2023-01-01',
        treasury_yield: null,
        corporate_yield: 4.5,
        spread_yield: null,
      },
    ];

    render(<Chart {...defaultProps} data={dataWithNulls} />);

    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('should handle different source configurations', () => {
    const customProps = {
      ...defaultProps,
      sources: ['Treasury'],
      yieldKeys: {
        'Treasury': 'treasury_yield',
      },
      colors: {
        'Treasury': '#4f46e5',
      },
    };

    render(<Chart {...customProps} />);

    const lines = screen.getAllByTestId('line');
    expect(lines).toHaveLength(1);
  });
});
