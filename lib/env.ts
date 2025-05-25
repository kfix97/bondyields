const getEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    // Fallback values for development only
    const fallbacks: Record<string, string> = {
      FRED_API_KEY: process.env.FRED_API_KEY ?? '',
      ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY ?? ''
    };
    
    if (process.env.NODE_ENV === 'development' && fallbacks[name]) {
      console.warn(`Using fallback value for ${name}. Please set up .env.local file.`);
      return fallbacks[name];
    }
    
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const env = {
  FRED_API_KEY: getEnvVar('FRED_API_KEY'),
  ALPHA_VANTAGE_API_KEY: getEnvVar('ALPHA_VANTAGE_API_KEY'),
} as const; 