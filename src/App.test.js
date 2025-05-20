import React from 'react';
// Mock out heavy components that rely on browser APIs or large data
jest.mock('./components/BasemapToggle', () => () => <div data-testid="basemap-toggle" />);
jest.mock('./components/MapContainer', () => () => <div data-testid="map-container" />);
jest.mock('./components/DamLevels', () => () => <button>Dam Levels</button>);
jest.mock('./components/DamPopup', () => () => <div data-testid="dam-popup" />);
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
