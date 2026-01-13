The spread between corporate and Treasury bond yields represents the credit risk premium investors demand to hold corporate bonds over ‘risk-free’ government bonds.

Treasury yields reflect the baseline cost of capital (risk-free rate), while corporate bond yields include additional compensation for default risk, liquidity, and other factors.

A widening spread typically signals increased market concern about corporate creditworthiness (e.g., during recessions), while a narrowing spread can indicate improving investor confidence.

Site available at https://bondyields.vercel.app/

Built with help from Cursor and Mike Osborne

## Environment Setup

### Local Development
Create a `.env.local` file in the root project directory with:
```
FRED_API_KEY=your_fred_api_key_here
```

### Vercel Deployment
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add a new variable:
   - **Name**: `FRED_API_KEY`
   - **Value**: Your FRED API key
   - **Environment**: Production, Preview, and Development (select all)
4. Redeploy your application

You can get a free FRED API key from: https://fred.stlouisfed.org/docs/api/api_key.html