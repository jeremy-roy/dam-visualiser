import './App.css';

import React, { useState, useEffect, useMemo } from 'react';
import BasemapToggle from './components/BasemapToggle';
import DatePickerToggle from './components/DatePickerToggle';
import MapContainer from './components/MapContainer';
import DamPopup from './components/DamPopup';
import DamLevels, { BatteryIcon, getBatteryColor } from './components/DamLevels';
import useIsMobile from './hooks/useIsMobile';
import { fetchFromStorage } from './firebase-config';

function App() {
  // Raw GeoJSON dam data
  const [data, setData] = useState(null);
  // Daily time-series data for dams
  const [dailyLevels, setDailyLevels] = useState(null);
  // Currently selected date for visualization (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/light-v10');
  const [selectedDam, setSelectedDam] = useState(null);
  const [showLevels, setShowLevels] = useState(false);
  // panTo: { coords: [lng, lat], zoom: number }
  const [panTo, setPanTo] = useState(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    // fetch the GeoJSON data from Firebase Storage
    fetchFromStorage('shapefiles/Bulk_Water_Dams_Enriched.geojson')
      .then(raw => {
        // Use MultiPolygon geometries directly (deck.gl GeoJsonLayer supports MultiPolygon)
        setData(raw);
      })
      .catch(console.error);
  }, []);

  // fetch daily time-series data for dams
  useEffect(() => {
    fetchFromStorage('timeseries/dam_levels_daily.json')
      .then(json => setDailyLevels(json))
      .catch(console.error);
  }, []);

  // set default selected date to latest available in Big 6 series
  useEffect(() => {
    if (!selectedDate && dailyLevels && Array.isArray(dailyLevels['totalstored-big6'])) {
      const series = dailyLevels['totalstored-big6'];
      if (series.length > 0) {
        setSelectedDate(series[series.length - 1].date);
      }
    }
  }, [dailyLevels, selectedDate]);

  // Derive GeoJSON features augmented with values for the selected date
  const processedData = useMemo(() => {
    if (!data || !dailyLevels || !selectedDate) return data;
    // key derivation matching timeseries JSON keys
    const deriveKey = name => {
      const lower = (name || '').toLowerCase().replace(/\s*dam$/i, '');
      const noSpace = lower.replace(/\s+/g, '');
      const parts = noSpace.split('-').filter(Boolean);
      return parts.length > 1
        ? parts[0] + '-' + parts.slice(1).join('')
        : parts[0] || '';
    };
    const features = data.features.map(feature => {
      const props = { ...feature.properties };
      const key = deriveKey(props.NAME);
      const series = dailyLevels[key] || [];
      const entry = series.find(item => item.date === selectedDate);
      if (entry && entry.percent_full != null) {
        props.current_percentage_full = parseFloat(entry.percent_full);
        props.current_date = entry.date;
      }
      return { ...feature, properties: props };
    });
    // Add console log for selected date and augmented features
    console.log('Selected Date:', selectedDate);
    console.log('Augmented Features:', features);
    return { ...data, features };
  }, [data, dailyLevels, selectedDate]);

  // Compute Big 6 summary percentage based on selected date
  const big6Pct = useMemo(() => {
    if (dailyLevels && selectedDate && Array.isArray(dailyLevels['totalstored-big6'])) {
      const entry = dailyLevels['totalstored-big6'].find(item => item.date === selectedDate);
      if (entry && entry.percent_full != null) {
        return parseFloat(entry.percent_full);
      }
    }
    return null;
  }, [dailyLevels, selectedDate, data]);
  const big6Rounded = big6Pct != null ? Math.round(big6Pct) : null;
  const big6Color = getBatteryColor(big6Rounded);

  return (
    <div className="App" style={{ position: 'relative', height: '100vh' }}>
      <BasemapToggle currentStyle={mapStyle} onChange={setMapStyle} />
      <DatePickerToggle selectedDate={selectedDate} onChange={setSelectedDate} />
      <button
        className="dam-levels-button"
        onClick={() => setShowLevels(open => !open)}
        aria-pressed={showLevels}
      >
        {/* Battery icon for Big 6 storage */}
        {big6Rounded != null && (
          <BatteryIcon
            percent={big6Rounded}
            color={big6Color}
            style={{ opacity: showLevels ? 0 : 1, transition: 'opacity 0.3s ease' }}
          />
        )}
        Dam Levels
        {/* Chevron indicating expandable panel */}
        <svg className="dam-levels-chevron" width="10" height="6" viewBox="0 0 10 6">
          <path
            d="M1 1 L5 5 L9 1"
            stroke="currentColor"
            fill="none"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {/* Render map only when GeoJSON features are loaded */}
      {processedData && Array.isArray(processedData.features) && processedData.features.length > 0 && (
        <MapContainer
          data={processedData}
          mapStyle={mapStyle}
          onSelectDam={setSelectedDam}
          panTo={panTo}
        />
      )}
      {/* Show dam levels list after features are available */}
      {processedData && Array.isArray(processedData.features) && processedData.features.length > 0 && (
        <DamLevels
          data={processedData}
          selectedDate={selectedDate}
          open={showLevels}
          selectedFeature={selectedDam}
          onClose={() => setShowLevels(false)}
          onSelectDam={coords => {
            setPanTo({ coords, zoom: 12 });
          }}
          onSelectSummary={feature => {
            setSelectedDam(feature);
          }}
          onSelectFeature={feature => {
            setSelectedDam(feature);
          }}
        />
      )}
      {selectedDam && !isMobile && (
        <DamPopup
          dam={selectedDam}
          onClose={() => setSelectedDam(null)}
          initialPos={showLevels ? { x: 360, y: 10 } : undefined}
        />
      )}
    </div>
  );
}

export default App;