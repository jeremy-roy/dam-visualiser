import React, { useMemo, useState } from 'react';
import './DamLevels.css';

// Battery icon showing fill level and color
function BatteryIcon({ percent, color }) {
  // clamp percent
  const p = percent != null && !isNaN(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  // compute inner fill width (max 36px)
  const fillWidth = (36 * p) / 100;
  return (
    <svg width="44" height="20" viewBox="0 0 44 20" style={{ verticalAlign: 'middle', marginRight: '6px' }}>
      <rect x="1" y="1" width="40" height="18" rx="2" fill="none" stroke="black" strokeWidth="2" />
      <rect x="41" y="5" width="2" height="10" rx="1" fill="black" />
      <rect x="2" y="2" width={fillWidth} height="16" fill={color} />
    </svg>
  );
}
// Map percentage to discrete battery color bands
function getBatteryColor(percent) {
  const p = percent != null && !isNaN(percent) ? Math.max(0, Math.min(100, percent)) : null;
  if (p == null) return 'rgb(200,200,200)';
  // 5 discrete bands
  if (p <= 20) return '#FF6961';        // red
  if (p <= 40) return '#FFB54C';        // amber
  if (p <= 60) return '#F8D66D';        // light-yellow
  if (p <= 80) return '#7ABD7E';        // light-green
  return '#8CD47E';                     // green
}

// Panel showing list of dams and their current % full
// data: GeoJSON feature collection, onClose: function, onSelectDam: function(coords), onSelectSummary: function(summaryFeature)
function DamLevels({ data, onClose, onSelectDam, onSelectSummary, onSelectFeature, open }) {
  // Ensure features is always an array for hooks
  const features = Array.isArray(data?.features) ? data.features : [];
  // track last clicked dam name to differentiate zoom vs popup
  const [lastClicked, setLastClicked] = useState(null);
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
  
  // Compute summary percentages and colors
  const big6Pct = big6Summary?.properties?.current_percentage_full != null
    ? parseFloat(big6Summary.properties.current_percentage_full)
    : null;
  const big6Rounded = big6Pct != null ? Math.round(big6Pct) : null;
  const big6Color = getBatteryColor(big6Rounded);
  const big5Pct = big5Summary?.properties?.current_percentage_full != null
    ? parseFloat(big5Summary.properties.current_percentage_full)
    : null;
  const big5Rounded = big5Pct != null ? Math.round(big5Pct) : null;
  const big5Color = getBatteryColor(big5Rounded);
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
    // prepare percent and color for battery icon
    const pct = percent != null && !isNaN(percent) ? percent : null;
    const color = getBatteryColor(pct);
    return {
      feature,
      name: props.NAME || 'Unknown',
      percent: pct != null ? Math.round(pct) : null,
      coords,
      color
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
            <span className="dam-name">
              <BatteryIcon percent={big6Rounded} color={big6Color} />
              Big 6 Total
            </span>
            <span className="dam-percent">
              {big6Rounded != null ? `${big6Rounded}%` : 'N/A'}
            </span>
          </li>
          <li
            key="big5"
            className="dam-levels-item summary"
            onClick={() => { if (onSelectSummary) onSelectSummary(big5Summary); }}
            style={{ cursor: 'pointer' }}
          >
            <span className="dam-name">
              <BatteryIcon percent={big5Rounded} color={big5Color} />
              Big 5 Total
            </span>
            <span className="dam-percent">
              {big5Rounded != null ? `${big5Rounded}%` : 'N/A'}
            </span>
          </li>
          {/* Individual dams */}
          {dams.map((d, i) => (
            <li
              key={i}
              className="dam-levels-item"
              onClick={() => {
                if (!d.coords) return;
                if (lastClicked === d.name) {
                  // second click: open/update popup chart
                  if (onSelectFeature) onSelectFeature(d.feature);
                } else {
                  // first click: pan/zoom
                  setLastClicked(d.name);
                  if (onSelectDam) onSelectDam(d.coords);
                }
              }}
              style={{ cursor: d.coords ? 'pointer' : 'default' }}
            >
              <span className="dam-name">
                <BatteryIcon percent={d.percent} color={d.color} />
                {d.name}
              </span>
              <span className="dam-percent">
                {d.percent != null ? `${d.percent}%` : 'N/A'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default DamLevels;