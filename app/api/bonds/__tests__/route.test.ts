import { GET } from '../route';
import axios from 'axios';

// Polyfill Request for Node.js environment  
if (typeof global.Request === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).Request = class Request {
    url: string;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(input: string | Request, init?: RequestInit) {
      this.url = typeof input === 'string' ? input : (input as Request).url;
    }
  };
}

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock NextResponse to return proper Response-like object
const createMockResponse = (body: unknown, init?: { status?: number }) => {
  return {
    json: async () => body,
    status: init?.status || 200,
    statusText: init?.status === 400 ? 'Bad Request' : init?.status === 500 ? 'Internal Server Error' : 'OK',
    ok: (init?.status || 200) < 400,
    headers: new Headers(),
  };
};

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => createMockResponse(body, init)),
  },
}));

describe('/api/bonds', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks(); // Use clearAllMocks instead of resetAllMocks to preserve mock implementations
    process.env = {
      ...originalEnv,
      FRED_API_KEY: 'test-api-key',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('GET', () => {
    it('should return 500 if FRED_API_KEY is not configured', async () => {
      // Temporarily remove API key
      const originalKey = process.env.FRED_API_KEY;
      delete process.env.FRED_API_KEY;

      const request = new Request('http://localhost/api/bonds?series=AAA&treasury=DGS10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.status).toBe('error');
      expect(data.errorType).toBe('ConfigurationError');
      expect(data.message).toContain('FRED API key is not configured');

      // Restore API key
      if (originalKey) {
        process.env.FRED_API_KEY = originalKey;
      }
    });

    it('should return 400 if series parameter is missing', async () => {
      const request = new Request('http://localhost/api/bonds?treasury=DGS10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Both series and treasury parameters are required');
    });

    it('should return 400 if treasury parameter is missing', async () => {
      const request = new Request('http://localhost/api/bonds?series=AAA');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Both series and treasury parameters are required');
    });

    it('should return 400 if both parameters are missing', async () => {
      const request = new Request('http://localhost/api/bonds');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Both series and treasury parameters are required');
    });

    it('should successfully fetch and return bond data', async () => {
      const mockTreasuryData = {
        observations: [
          { date: '2023-01-01', value: '3.5' },
          { date: '2023-01-02', value: '3.6' },
        ],
      };

      const mockCorporateData = {
        observations: [
          { date: '2023-01-01', value: '4.5' },
          { date: '2023-01-02', value: '4.6' },
        ],
      };

      // Mock latest data (same as the last items in the date range for this test)
      const mockLatestTreasury = {
        observations: [{ date: '2023-01-02', value: '3.6' }],
      };

      const mockLatestCorporate = {
        observations: [{ date: '2023-01-02', value: '4.6' }],
      };

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockTreasuryData, status: 200 }) // Treasury for date range
        .mockResolvedValueOnce({ data: mockCorporateData, status: 200 }) // Corporate for date range
        .mockResolvedValueOnce({ data: mockLatestTreasury, status: 200 }) // Latest Treasury
        .mockResolvedValueOnce({ data: mockLatestCorporate, status: 200 }); // Latest Corporate

      const request = new Request('http://localhost/api/bonds?series=AAA&treasury=DGS10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.message).toBe('Data fetched successfully');
      expect(data.chartData).toHaveLength(4); // Latest data already in range, so no duplicates
      expect(data.latestData.treasury.yield).toBe(3.6);
      expect(data.latestData.corporate.yield).toBe(4.6);
      expect(mockedAxios.get).toHaveBeenCalledTimes(4); // 2 for date range + 2 for latest
    });

    it('should filter out null values from observations', async () => {
      const mockTreasuryData = {
        observations: [
          { date: '2023-01-01', value: '3.5' },
          { date: '2023-01-02', value: 'ND' }, // No data
          { date: '2023-01-03', value: '3.7' },
        ],
      };

      const mockCorporateData = {
        observations: [
          { date: '2023-01-01', value: '4.5' },
          { date: '2023-01-02', value: 'ND' },
          { date: '2023-01-03', value: '4.7' },
        ],
      };

      const mockLatestTreasury = {
        observations: [{ date: '2023-01-03', value: '3.7' }],
      };

      const mockLatestCorporate = {
        observations: [{ date: '2023-01-03', value: '4.7' }],
      };

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockTreasuryData, status: 200 })
        .mockResolvedValueOnce({ data: mockCorporateData, status: 200 })
        .mockResolvedValueOnce({ data: mockLatestTreasury, status: 200 })
        .mockResolvedValueOnce({ data: mockLatestCorporate, status: 200 });

      const request = new Request('http://localhost/api/bonds?series=AAA&treasury=DGS10');
      const response = await GET(request);
      const data = await response.json();

      expect(data.chartData).toHaveLength(4); // Only valid values
      expect(data.chartData.every((item: { yield: number | null }) => item.yield !== null)).toBe(true);
    });

    it('should use custom start and end dates from query params', async () => {
      const mockTreasuryData = { observations: [{ date: '2023-06-01', value: '3.5' }] };
      const mockCorporateData = { observations: [{ date: '2023-06-01', value: '4.5' }] };
      const mockLatestTreasury = { observations: [{ date: '2023-06-01', value: '3.5' }] };
      const mockLatestCorporate = { observations: [{ date: '2023-06-01', value: '4.5' }] };

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockTreasuryData, status: 200 })
        .mockResolvedValueOnce({ data: mockCorporateData, status: 200 })
        .mockResolvedValueOnce({ data: mockLatestTreasury, status: 200 })
        .mockResolvedValueOnce({ data: mockLatestCorporate, status: 200 });

      const request = new Request(
        'http://localhost/api/bonds?series=AAA&treasury=DGS10&start=2023-06-01&end=2023-06-30'
      );
      await GET(request);

      const treasuryCall = mockedAxios.get.mock.calls[0][0] as string;
      const corporateCall = mockedAxios.get.mock.calls[1][0] as string;

      expect(treasuryCall).toContain('observation_start=2023-06-01');
      expect(treasuryCall).toContain('observation_end=2023-06-30');
      expect(corporateCall).toContain('observation_start=2023-06-01');
      expect(corporateCall).toContain('observation_end=2023-06-30');
    });

    it('should use default date range when start and end are not provided', async () => {
      const mockTreasuryData = { observations: [{ date: '2023-01-01', value: '3.5' }] };
      const mockCorporateData = { observations: [{ date: '2023-01-01', value: '4.5' }] };
      const mockLatestTreasury = { observations: [{ date: '2023-01-01', value: '3.5' }] };
      const mockLatestCorporate = { observations: [{ date: '2023-01-01', value: '4.5' }] };

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockTreasuryData, status: 200 })
        .mockResolvedValueOnce({ data: mockCorporateData, status: 200 })
        .mockResolvedValueOnce({ data: mockLatestTreasury, status: 200 })
        .mockResolvedValueOnce({ data: mockLatestCorporate, status: 200 });

      const request = new Request('http://localhost/api/bonds?series=AAA&treasury=DGS10');
      await GET(request);

      const treasuryCall = mockedAxios.get.mock.calls[0][0] as string;
      expect(treasuryCall).toContain('observation_start=');
      expect(treasuryCall).toContain('observation_end=');
    });

    it('should sort chart data by date', async () => {
      const mockTreasuryData = {
        observations: [
          { date: '2023-01-03', value: '3.5' },
          { date: '2023-01-01', value: '3.3' },
        ],
      };

      const mockCorporateData = {
        observations: [
          { date: '2023-01-02', value: '4.4' },
          { date: '2023-01-04', value: '4.6' },
        ],
      };

      const mockLatestTreasury = {
        observations: [{ date: '2023-01-03', value: '3.5' }],
      };

      const mockLatestCorporate = {
        observations: [{ date: '2023-01-04', value: '4.6' }],
      };

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockTreasuryData, status: 200 })
        .mockResolvedValueOnce({ data: mockCorporateData, status: 200 })
        .mockResolvedValueOnce({ data: mockLatestTreasury, status: 200 })
        .mockResolvedValueOnce({ data: mockLatestCorporate, status: 200 });

      const request = new Request('http://localhost/api/bonds?series=AAA&treasury=DGS10');
      const response = await GET(request);
      const data = await response.json();

      const dates = data.chartData.map((item: { date: string }) => item.date);
      expect(dates).toEqual(['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04']);
    });

    it('should handle 403 errors with specific message', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      try {
        const error = new Error('Forbidden');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const axiosErrorLike = error as any;
        axiosErrorLike.response = {
          status: 403,
          statusText: 'Forbidden',
          data: { error: 'Access denied' },
        };
        axiosErrorLike.config = {
          url: 'https://api.stlouisfed.org/fred/series/observations',
          method: 'get',
        };
        axiosErrorLike.isAxiosError = true;
        axiosErrorLike.name = 'AxiosError';

        mockedAxios.get.mockRejectedValueOnce(axiosErrorLike);

        const request = new Request('http://localhost/api/bonds?series=AAA&treasury=DGS10');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.status).toBe('error');
        expect(data.errorType).toBe('AxiosError');
        expect(data.httpStatus).toBe(403);
        expect(data.message).toContain('FRED API access denied');
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });

    it('should handle 400 errors with specific message', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      try {
        const error = new Error('Bad Request');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const axiosErrorLike = error as any;
        axiosErrorLike.response = {
          status: 400,
          statusText: 'Bad Request',
          data: { error: 'Invalid parameters' },
        };
        axiosErrorLike.config = {
          url: 'https://api.stlouisfed.org/fred/series/observations',
          method: 'get',
        };
        axiosErrorLike.isAxiosError = true;
        axiosErrorLike.name = 'AxiosError';

        mockedAxios.get.mockRejectedValueOnce(axiosErrorLike);

        const request = new Request('http://localhost/api/bonds?series=AAA&treasury=DGS10');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.status).toBe('error');
        expect(data.errorType).toBe('AxiosError');
        expect(data.httpStatus).toBe(400);
        expect(data.message).toContain('Invalid request to FRED API');
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });

    it('should handle errors when fetching latest Treasury data gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      try {
        const mockTreasuryData = {
          observations: [{ date: '2023-01-01', value: '3.5' }],
        };
        const mockCorporateData = {
          observations: [{ date: '2023-01-01', value: '4.5' }],
        };

        mockedAxios.get
          .mockResolvedValueOnce({ data: mockTreasuryData, status: 200 }) // Treasury for date range
          .mockResolvedValueOnce({ data: mockCorporateData, status: 200 }) // Corporate for date range
          .mockRejectedValueOnce(new Error('Failed to fetch latest Treasury')) // Latest Treasury fails
          .mockResolvedValueOnce({ data: { observations: [{ date: '2023-01-02', value: '4.6' }] }, status: 200 }); // Latest Corporate succeeds

        const request = new Request('http://localhost/api/bonds?series=AAA&treasury=DGS10');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.status).toBe('success');
        // Should still return data even if latest Treasury fetch fails
        expect(data.chartData).toBeDefined();
      } finally {
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
      }
    });

    it('should handle errors when fetching latest Corporate data gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      try {
        const mockTreasuryData = {
          observations: [{ date: '2023-01-01', value: '3.5' }],
        };
        const mockCorporateData = {
          observations: [{ date: '2023-01-01', value: '4.5' }],
        };

        mockedAxios.get
          .mockResolvedValueOnce({ data: mockTreasuryData, status: 200 }) // Treasury for date range
          .mockResolvedValueOnce({ data: mockCorporateData, status: 200 }) // Corporate for date range
          .mockResolvedValueOnce({ data: { observations: [{ date: '2023-01-02', value: '3.6' }] }, status: 200 }) // Latest Treasury succeeds
          .mockRejectedValueOnce(new Error('Failed to fetch latest Corporate')); // Latest Corporate fails

        const request = new Request('http://localhost/api/bonds?series=AAA&treasury=DGS10');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.status).toBe('success');
        // Should still return data even if latest Corporate fetch fails
        expect(data.chartData).toBeDefined();
      } finally {
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
      }
    });

    it('should handle invalid yield values in latest Treasury data', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      try {
        const mockTreasuryData = {
          observations: [{ date: '2023-01-01', value: '3.5' }],
        };
        const mockCorporateData = {
          observations: [{ date: '2023-01-01', value: '4.5' }],
        };

        mockedAxios.get
          .mockResolvedValueOnce({ data: mockTreasuryData, status: 200 }) // Treasury for date range
          .mockResolvedValueOnce({ data: mockCorporateData, status: 200 }) // Corporate for date range
          .mockResolvedValueOnce({ data: { observations: [{ date: '2023-01-02', value: 'invalid' }] }, status: 200 }) // Latest Treasury with invalid value
          .mockResolvedValueOnce({ data: { observations: [{ date: '2023-01-02', value: '4.6' }] }, status: 200 }); // Latest Corporate

        const request = new Request('http://localhost/api/bonds?series=AAA&treasury=DGS10');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.status).toBe('success');
        // Should still work even with invalid latest Treasury value
        expect(data.chartData).toBeDefined();
      } finally {
        consoleWarnSpy.mockRestore();
      }
    });

    it('should handle invalid yield values in latest Corporate data', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      try {
        const mockTreasuryData = {
          observations: [{ date: '2023-01-01', value: '3.5' }],
        };
        const mockCorporateData = {
          observations: [{ date: '2023-01-01', value: '4.5' }],
        };

        mockedAxios.get
          .mockResolvedValueOnce({ data: mockTreasuryData, status: 200 }) // Treasury for date range
          .mockResolvedValueOnce({ data: mockCorporateData, status: 200 }) // Corporate for date range
          .mockResolvedValueOnce({ data: { observations: [{ date: '2023-01-02', value: '3.6' }] }, status: 200 }) // Latest Treasury
          .mockResolvedValueOnce({ data: { observations: [{ date: '2023-01-02', value: 'NaN' }] }, status: 200 }); // Latest Corporate with invalid value

        const request = new Request('http://localhost/api/bonds?series=AAA&treasury=DGS10');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.status).toBe('success');
        // Should still work even with invalid latest Corporate value
        expect(data.chartData).toBeDefined();
      } finally {
        consoleWarnSpy.mockRestore();
      }
    });

    it('should handle missing observations in latest Treasury data', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      try {
        const mockTreasuryData = {
          observations: [{ date: '2023-01-01', value: '3.5' }],
        };
        const mockCorporateData = {
          observations: [{ date: '2023-01-01', value: '4.5' }],
        };

        mockedAxios.get
          .mockResolvedValueOnce({ data: mockTreasuryData, status: 200 }) // Treasury for date range
          .mockResolvedValueOnce({ data: mockCorporateData, status: 200 }) // Corporate for date range
          .mockResolvedValueOnce({ data: { observations: [] }, status: 200 }) // Latest Treasury with no observations
          .mockResolvedValueOnce({ data: { observations: [{ date: '2023-01-02', value: '4.6' }] }, status: 200 }); // Latest Corporate

        const request = new Request('http://localhost/api/bonds?series=AAA&treasury=DGS10');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.status).toBe('success');
        // Should still work even with no latest Treasury observations
        expect(data.chartData).toBeDefined();
      } finally {
        consoleWarnSpy.mockRestore();
      }
    });

    it('should handle missing observations in latest Corporate data', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      try {
        const mockTreasuryData = {
          observations: [{ date: '2023-01-01', value: '3.5' }],
        };
        const mockCorporateData = {
          observations: [{ date: '2023-01-01', value: '4.5' }],
        };

        mockedAxios.get
          .mockResolvedValueOnce({ data: mockTreasuryData, status: 200 }) // Treasury for date range
          .mockResolvedValueOnce({ data: mockCorporateData, status: 200 }) // Corporate for date range
          .mockResolvedValueOnce({ data: { observations: [{ date: '2023-01-02', value: '3.6' }] }, status: 200 }) // Latest Treasury
          .mockResolvedValueOnce({ data: { observations: [] }, status: 200 }); // Latest Corporate with no observations

        const request = new Request('http://localhost/api/bonds?series=AAA&treasury=DGS10');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.status).toBe('success');
        // Should still work even with no latest Corporate observations
        expect(data.chartData).toBeDefined();
      } finally {
        consoleWarnSpy.mockRestore();
      }
    });

    it('should handle latest data that already exists in chartData', async () => {
      const mockTreasuryData = {
        observations: [{ date: '2023-01-01', value: '3.5' }],
      };
      const mockCorporateData = {
        observations: [{ date: '2023-01-01', value: '4.5' }],
      };
      // Latest data matches the date in the date range, so it should already exist
      const mockLatestTreasury = {
        observations: [{ date: '2023-01-01', value: '3.5' }],
      };
      const mockLatestCorporate = {
        observations: [{ date: '2023-01-01', value: '4.5' }],
      };

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockTreasuryData, status: 200 }) // Treasury for date range
        .mockResolvedValueOnce({ data: mockCorporateData, status: 200 }) // Corporate for date range
        .mockResolvedValueOnce({ data: mockLatestTreasury, status: 200 }) // Latest Treasury (same date)
        .mockResolvedValueOnce({ data: mockLatestCorporate, status: 200 }); // Latest Corporate (same date)

      const request = new Request('http://localhost/api/bonds?series=AAA&treasury=DGS10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      // ChartData should not have duplicates
      expect(data.chartData.length).toBe(2); // Only Treasury and Corporate, no duplicates
    });

    it('should handle axios errors gracefully', async () => {
      // Mock console.error to suppress output during this test (CI environments may fail on console.error)
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
        // Suppress console.error output in tests
      });

      try {
        // Create an error that mimics AxiosError structure
        // Note: instanceof checks may fail in test environment, so we test error handling generally
        const error = new Error('Request failed');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const axiosErrorLike = error as any;
        axiosErrorLike.response = {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'API Error' },
        };
        axiosErrorLike.config = {
          url: 'https://api.stlouisfed.org/fred/series/observations',
          method: 'get',
        };
        axiosErrorLike.isAxiosError = true;
        axiosErrorLike.name = 'AxiosError';

        // Mock the first axios call (Treasury date range) to fail
        // The API makes 4 calls total, but we only need the first one to fail to test error handling
        mockedAxios.get.mockRejectedValueOnce(axiosErrorLike);

        const request = new Request('http://localhost/api/bonds?series=AAA&treasury=DGS10');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.status).toBe('error');
        expect(data.message).toBe('Request failed');
        expect(data.errorType).toBe('AxiosError');
      } finally {
        // Restore console.error after test
        consoleErrorSpy.mockRestore();
      }
    });

    it('should handle missing observations in treasury response', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: {}, status: 200 });

      const request = new Request('http://localhost/api/bonds?series=AAA&treasury=DGS10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.status).toBe('error');
      expect(data.message).toContain('No observations found in FRED response for Treasury data');
    });

    it('should handle missing observations in corporate response', async () => {
      const mockTreasuryData = {
        observations: [{ date: '2023-01-01', value: '3.5' }],
      };

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockTreasuryData, status: 200 })
        .mockResolvedValueOnce({ data: {}, status: 200 });

      const request = new Request('http://localhost/api/bonds?series=AAA&treasury=DGS10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.status).toBe('error');
      expect(data.message).toContain('No observations found in FRED response for Corporate data');
    });

    it('should handle generic errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const request = new Request('http://localhost/api/bonds?series=AAA&treasury=DGS10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.status).toBe('error');
      expect(data.message).toBe('Network error');
    });

    it('should include timestamp in error response', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Test error'));

      const request = new Request('http://localhost/api/bonds?series=AAA&treasury=DGS10');
      const response = await GET(request);
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp).getTime()).not.toBeNaN();
    });
  });
});
