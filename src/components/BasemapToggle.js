import React from 'react';

function BasemapToggle({ mapStyle, onStyleChange }) {
  return (
    <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1, background: 'white', padding: '8px', borderRadius: '4px' }}>
      <label htmlFor="map-style" style={{ marginRight: '8px' }}>Basemap:</label>
      <select
        id="map-style"
        value={mapStyle}
        onChange={e => onStyleChange(e.target.value)}
      >
        <option value="mapbox://styles/mapbox/light-v10">Light</option>
        <option value="mapbox://styles/mapbox/dark-v10">Dark</option>
        <option value="mapbox://styles/mapbox/satellite-v9">Satellite</option>
      </select>
    </div>
  );
}

export default BasemapToggle;