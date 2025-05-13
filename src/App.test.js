import { render, screen } from '@testing-library/react';
import App from './App';

// Mock fetch to prevent network calls in tests
beforeAll(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ json: () => Promise.resolve({ features: [] }) })
  );
});

test('renders Dam Levels button', () => {
  render(<App />);
  const buttonElement = screen.getByText(/Dam Levels/i);
  expect(buttonElement).toBeInTheDocument();
});
