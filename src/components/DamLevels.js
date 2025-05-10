import React from 'react';
import './DamLevels.css';

// Panel showing list of dams and their current % full
// data: GeoJSON feature collection, onClose: function, onSelectDam: function(coords)
function DamLevels({ data, onClose, onSelectDam, open }) {
  if (!data || !Array.isArray(data.features)) return null;
  // Build list of dams with current percentage
  // Build list of dams with name, percent, and first coordinate for zoom
  const dams = data.features.map(feature => {
    const props = feature.properties || {};
    let percent = null;
    if (Array.isArray(props.storage_levels) && props.storage_levels.length) {
      const latest = props.storage_levels[props.storage_levels.length - 1];
      percent = latest && latest.percent_full;
    } else if (props.current_percentage_full != null) {
      percent = parseFloat(props.current_percentage_full);
    }
    // Extract first coordinate of polygon for zoom [lng, lat]
    let coords = null;
    if (
      feature.geometry &&
      feature.geometry.type === 'Polygon' &&
      Array.isArray(feature.geometry.coordinates) &&
      Array.isArray(feature.geometry.coordinates[0]) &&
      Array.isArray(feature.geometry.coordinates[0][0])
    ) {
      coords = feature.geometry.coordinates[0][0];
    }
    return {
      name: props.NAME || 'Unknown',
      percent: percent != null && !isNaN(percent) ? Math.round(percent) : null,
      coords,
    };
  });
  return (
    <div className="dam-levels-overlay">
      <div className={`dam-levels-panel${open ? ' open' : ''}`}>
        <div className="dam-levels-header">
          <h3>Dam Levels</h3>
          <button className="dam-levels-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <ul className="dam-levels-list">
          {dams.map((d, i) => (
            <li
              key={i}
              className="dam-levels-item"
              onClick={() => {
                if (d.coords && onSelectDam) onSelectDam(d.coords);
              }}
              style={{ cursor: d.coords ? 'pointer' : 'default' }}
            >
              <span className="dam-name">{d.name}</span>
              <span className="dam-percent">
                {d.percent != null ? `${d.percent}% full` : 'N/A'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default DamLevels;