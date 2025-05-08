import './App.css';

import React, { useState, useEffect } from 'react';
import BasemapToggle from './components/BasemapToggle';
import MapContainer from './components/MapContainer';
import DamPopup from './components/DamPopup';

function App() {
  const [data, setData] = useState(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/light-v10');
  const [selectedDam, setSelectedDam] = useState(null);

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

  return (
    <div className="App" style={{ position: 'relative', height: '100vh' }}>
      <BasemapToggle mapStyle={mapStyle} onStyleChange={setMapStyle} />
      {data && (
        <MapContainer
          data={data}
          mapStyle={mapStyle}
          onSelectDam={setSelectedDam}
        />
      )}
      {selectedDam && (
        <DamPopup dam={selectedDam} onClose={() => setSelectedDam(null)} />
      )}
    </div>
  );
}

export default App;
