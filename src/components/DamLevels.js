import React, { useMemo } from 'react';
import './DamLevels.css';

// Panel showing list of dams and their current % full
// data: GeoJSON feature collection, onClose: function, onSelectDam: function(coords), onSelectSummary: function(summaryFeature)
function DamLevels({ data, onClose, onSelectDam, onSelectSummary, open }) {
  // Ensure features is always an array for hooks
  const features = Array.isArray(data?.features) ? data.features : [];
  // Reference precomputed summary features for Big 6 and Big 5
  const big6Summary = useMemo(
    () => features.find(f => f.properties?.NAME === 'Big 6 Total'),
    [features]
  );
  const big5Summary = useMemo(
    () => features.find(f => f.properties?.NAME === 'Big 5 Total'),
    [features]
  );
  if (!features.length) return null;
  
  // Build list of individual dams (excluding summary features) with current percentage and zoom coords
  const dams = features
    .filter(feature => {
      const name = feature.properties?.NAME;
      return name !== 'Big 6 Total' && name !== 'Big 5 Total';
    })
    .map(feature => {
    const props = feature.properties || {};
    let percent = null;
    if (Array.isArray(props.storage_levels) && props.storage_levels.length) {
      const latest = props.storage_levels[props.storage_levels.length - 1];
      percent = latest && latest.percent_full;
    } else if (props.current_percentage_full != null) {
      percent = parseFloat(props.current_percentage_full);
    }
    // Extract coordinate for zoom: use centroid if provided in properties, otherwise first polygon coordinate
    let coords = null;
    if (
      props.centroid &&
      Array.isArray(props.centroid) &&
      props.centroid.length >= 2 &&
      typeof props.centroid[0] === 'number' &&
      typeof props.centroid[1] === 'number'
    ) {
      coords = props.centroid;
    } else if (
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
          {/* Summary totals for Big 6 and Big 5 */}
          <li
            key="big6"
            className="dam-levels-item summary"
            onClick={() => { if (onSelectSummary) onSelectSummary(big6Summary); }}
            style={{ cursor: 'pointer' }}
          >
            <span className="dam-name">Big 6 Total</span>
            <span className="dam-percent">
              {big6Summary.properties.current_percentage_full != null
                ? `${Math.round(big6Summary.properties.current_percentage_full)}% full`
                : 'N/A'}
            </span>
          </li>
          <li
            key="big5"
            className="dam-levels-item summary"
            onClick={() => { if (onSelectSummary) onSelectSummary(big5Summary); }}
            style={{ cursor: 'pointer' }}
          >
            <span className="dam-name">Big 5 Total</span>
            <span className="dam-percent">
              {big5Summary.properties.current_percentage_full != null
                ? `${Math.round(big5Summary.properties.current_percentage_full)}% full`
                : 'N/A'}
            </span>
          </li>
          {/* Individual dams */}
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