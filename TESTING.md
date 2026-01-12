# Testing Guide

This project uses Jest and React Testing Library for unit testing.

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (for development)
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test:coverage
```

### Run tests in CI mode
```bash
npm run test:ci
```

## Test Structure

Tests are located alongside the code they test:
- API routes: `app/api/**/__tests__/`
- Components: `app/components/__tests__/`
- Pages: `app/__tests__/`

## Pre-commit Hooks

Tests are automatically run before each commit using Husky. If tests fail, the commit will be blocked.

To bypass the pre-commit hook (not recommended):
```bash
git commit --no-verify
```

## CI/CD

Tests are automatically run on:
- Every pull request to `main`, `master`, or `develop` branches
- Every push to `main`, `master`, or `develop` branches

The CI workflow runs:
1. Linting (`npm run lint`)
2. Tests (`npm run test:ci`)

## Coverage Requirements

The project has minimum coverage thresholds:
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Writing Tests

### Example Test Structure

```typescript
import { render, screen } from '@testing-library/react';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Testing API Routes

API routes are tested by mocking external dependencies (like axios):

```typescript
import { GET } from '../route';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('/api/endpoint', () => {
  it('should handle requests correctly', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: mockData });
    // ... test implementation
  });
});
```

### Testing React Components

Components are tested using React Testing Library:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('MyComponent', () => {
  it('should handle user interactions', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Tests fail with "Cannot find module"
- Make sure all dependencies are installed: `npm install`
- Check that the module path is correct

### TypeScript errors in tests
- Ensure `jest.d.ts` is included in `tsconfig.json`
- Check that `@testing-library/jest-dom` types are properly imported

### Pre-commit hook not running
- Make sure Husky is installed: `npm install`
- Ensure `.husky/pre-commit` is executable: `chmod +x .husky/pre-commit`
