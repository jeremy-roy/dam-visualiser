import './App.css';

import React, { useState, useEffect, useMemo } from 'react';
import BasemapToggle from './components/BasemapToggle';
import MapContainer from './components/MapContainer';
import DamPopup from './components/DamPopup';
import DamLevels, { BatteryIcon, getBatteryColor } from './components/DamLevels';

function App() {
  const [data, setData] = useState(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/light-v10');
  const [selectedDam, setSelectedDam] = useState(null);
  const [showLevels, setShowLevels] = useState(false);
  // panTo: { coords: [lng, lat], zoom: number }
  const [panTo, setPanTo] = useState(null);

  useEffect(() => {
    // fetch the updated GeoJSON data in public/ directory
    fetch(process.env.PUBLIC_URL + '/Bulk_Water_Dams_Enriched.geojson')
      .then(res => res.json())
      .then(raw => {
        // flatten MultiPolygon features into individual Polygon features
        const features = raw.features.flatMap(feature => {
          if (feature.geometry && feature.geometry.type === 'MultiPolygon') {
            return feature.geometry.coordinates.map(coords => ({
              type: 'Feature',
              geometry: { type: 'Polygon', coordinates: coords },
              properties: feature.properties
            }));
          }
          return feature;
        });
        setData({ ...raw, features });
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
      {data && (
        <MapContainer
          data={data}
          mapStyle={mapStyle}
          onSelectDam={setSelectedDam}
          panTo={panTo}
        />
      )}
      {data && (
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
      {selectedDam && (
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