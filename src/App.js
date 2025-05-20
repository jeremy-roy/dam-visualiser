import './App.css';

import React, { useState, useEffect, useMemo } from 'react';
import BasemapToggle from './components/BasemapToggle';
import MapContainer from './components/MapContainer';
import DamPopup from './components/DamPopup';
import DamLevels, { BatteryIcon, getBatteryColor } from './components/DamLevels';
import useIsMobile from './hooks/useIsMobile';

function App() {
  const [data, setData] = useState(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/light-v10');
  const [selectedDam, setSelectedDam] = useState(null);
  const [showLevels, setShowLevels] = useState(false);
  // panTo: { coords: [lng, lat], zoom: number }
  const [panTo, setPanTo] = useState(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    // fetch the updated GeoJSON data in public/ directory
    fetch(process.env.PUBLIC_URL + '/Bulk_Water_Dams_Enriched.geojson')
      .then(res => res.json())
      .then(raw => {
        // Use MultiPolygon geometries directly (deck.gl GeoJsonLayer supports MultiPolygon)
        setData(raw);
      })
      .catch(console.error);
  }, []);

  // Compute Big 6 summary percentage for the button icon
  const big6Summary = useMemo(
    () => data && Array.isArray(data.features)
      ? data.features.find(f => f.properties?.NAME === 'Big 6 Total')
      : null,
    [data]
  );
  const big6Pct = big6Summary?.properties?.current_percentage_full != null
    ? parseFloat(big6Summary.properties.current_percentage_full)
    : null;
  const big6Rounded = big6Pct != null ? Math.round(big6Pct) : null;
  const big6Color = getBatteryColor(big6Rounded);

  return (
    <div className="App" style={{ position: 'relative', height: '100vh' }}>
      <BasemapToggle currentStyle={mapStyle} onChange={setMapStyle} />
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
      {data && Array.isArray(data.features) && data.features.length > 0 && (
        <MapContainer
          data={data}
          mapStyle={mapStyle}
          onSelectDam={setSelectedDam}
          panTo={panTo}
        />
      )}
      {/* Show dam levels list after features are available */}
      {data && Array.isArray(data.features) && data.features.length > 0 && (
        <DamLevels
          data={data}
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