import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BondsPage from '../page';

// Mock the components
jest.mock('../components/BondChart', () => {
  return function MockBondChart({ data }: { data: Array<{ date: string; yield: number | null; source: string }> }) {
    return <div data-testid="bond-chart">{data.length} data points</div>;
  };
});

jest.mock('../components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock fetch
global.fetch = jest.fn();

describe('BondsPage', () => {
  const mockBondData = {
    status: 'success',
    message: 'Data fetched successfully',
    latestData: {
      treasury: { date: '2023-01-01', yield: 3.5, source: 'Treasury' },
      corporate: { date: '2023-01-01', yield: 4.5, source: 'Corporate' },
    },
    chartData: [
      { date: '2023-01-01', yield: 3.5, source: 'Treasury' },
      { date: '2023-01-01', yield: 4.5, source: 'Corporate' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockBondData,
    });
  });

  it('should render the page title and description', () => {
    render(<BondsPage />);
    expect(screen.getByText('Bond Yield Spreads')).toBeInTheDocument();
    expect(screen.getByText(/Comparing Treasury and Corporate Yields/)).toBeInTheDocument();
  });

  it('should render treasury and corporate series selectors', () => {
    render(<BondsPage />);
    expect(screen.getByLabelText('Treasury Series')).toBeInTheDocument();
    expect(screen.getByLabelText('Corporate Series')).toBeInTheDocument();
  });

  it('should render date range inputs', () => {
    render(<BondsPage />);
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date')).toBeInTheDocument();
  });

  it('should fetch data when component mounts', async () => {
    render(<BondsPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(fetchCall).toContain('/api/bonds');
  });

  it('should update data when treasury series changes', async () => {
    const user = userEvent.setup();
    render(<BondsPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    jest.clearAllMocks();

    const treasurySelect = screen.getByLabelText('Treasury Series');
    await user.selectOptions(treasurySelect, 'DGS2');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(fetchCall).toContain('treasury=DGS2');
  });

  it('should update data when corporate series changes', async () => {
    const user = userEvent.setup();
    render(<BondsPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    jest.clearAllMocks();

    const corporateSelect = screen.getByLabelText('Corporate Series');
    await user.selectOptions(corporateSelect, 'BAMLC0A4CBBB');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(fetchCall).toContain('series=BAMLC0A4CBBB');
  });

  it('should validate date format and show error for invalid start date', async () => {
    const user = userEvent.setup();
    render(<BondsPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const startDateInput = screen.getByLabelText('Start Date');
    await user.clear(startDateInput);
    await user.type(startDateInput, 'invalid-date');

    await waitFor(() => {
      expect(screen.getByText(/Start date is invalid/)).toBeInTheDocument();
    });
  });

  it('should validate date format and show error for invalid end date', async () => {
    const user = userEvent.setup();
    render(<BondsPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const endDateInput = screen.getByLabelText('End Date');
    await user.clear(endDateInput);
    await user.type(endDateInput, 'invalid-date');

    await waitFor(() => {
      expect(screen.getByText(/End date is invalid/)).toBeInTheDocument();
    });
  });

  it('should show error when start date is after end date', async () => {
    const user = userEvent.setup();
    render(<BondsPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const startDateInput = screen.getByLabelText('Start Date');
    const endDateInput = screen.getByLabelText('End Date');

    await user.clear(endDateInput);
    await user.type(endDateInput, '2023-01-01');

    await user.clear(startDateInput);
    await user.type(startDateInput, '2023-12-31');

    await waitFor(() => {
      expect(screen.getByText(/Start date must be before end date/)).toBeInTheDocument();
    });
  });

  it('should not fetch data when there is a date error', async () => {
    const user = userEvent.setup();
    render(<BondsPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    jest.clearAllMocks();

    const startDateInput = screen.getByLabelText('Start Date');
    await user.clear(startDateInput);
    await user.type(startDateInput, 'invalid');

    // Wait a bit to ensure debounce doesn't trigger
    await waitFor(() => {
      expect(screen.getByText(/Start date is invalid/)).toBeInTheDocument();
    }, { timeout: 1000 });

    // Should not have called fetch with invalid date
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should debounce date changes', async () => {
    const user = userEvent.setup();
    render(<BondsPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    jest.clearAllMocks();

    const startDateInput = screen.getByLabelText('Start Date');
    
    // Rapidly change the date multiple times
    await user.clear(startDateInput);
    await user.type(startDateInput, '2023-01-01');
    await user.clear(startDateInput);
    await user.type(startDateInput, '2023-01-02');
    await user.clear(startDateInput);
    await user.type(startDateInput, '2023-01-03');

    // Wait for debounce
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    }, { timeout: 1000 });

    // Should only be called once after debounce
    expect((global.fetch as jest.Mock).mock.calls.length).toBeLessThanOrEqual(1);
  });

  it('should display error message when fetch fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<BondsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
    });
  });

  it('should display error message when API returns non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<BondsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Failed to fetch bond data/)).toBeInTheDocument();
    });
  });

  it('should render BondChart with fetched data', async () => {
    render(<BondsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('bond-chart')).toBeInTheDocument();
      expect(screen.getByText('2 data points')).toBeInTheDocument();
    });
  });

  it('should include date range in API call', async () => {
    render(<BondsPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(fetchCall).toContain('start=');
    expect(fetchCall).toContain('end=');
  });
});
