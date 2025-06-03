import React, { useState, useEffect } from 'react';
import './DamLevels.css';
import useIsMobile from '../hooks/useIsMobile';

// Battery icon showing fill level and color
// Battery icon showing fill level and color, accepts style and className for customization
function BatteryIcon({ percent, color, style = {}, className }) {
  // clamp percent
  const p = percent != null && !isNaN(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  // compute inner fill width (max 36px)
  const fillWidth = (36 * p) / 100;
  // merge default and custom styles
  const baseStyle = { verticalAlign: 'middle', marginRight: '6px' };
  const mergedStyle = { ...baseStyle, ...style };
  return (
    <svg
      className={className}
      width="44"
      height="20"
      viewBox="0 0 44 20"
      style={mergedStyle}
    >
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
function DamLevels({ data, selectedDate, onClose, onSelectDam, onSelectSummary, onSelectFeature, selectedFeature, open }) {
  // Ensure features is always an array for hooks
  const features = Array.isArray(data?.features) ? data.features : [];
  // track last clicked dam name to differentiate zoom vs popup
  const [lastClicked, setLastClicked] = useState(null);
  const isMobile = useIsMobile();
  // load daily timeseries data (including Big 6 and individual dams)
  const [dailyLevelsData, setDailyLevelsData] = useState(null);
  const [big6Series, setBig6Series] = useState([]);
  useEffect(() => {
    let mounted = true;
    import('../firebase-config').then(({ fetchFromStorage }) => {
      fetchFromStorage('timeseries/dam_levels_daily.json')
        .then(json => {
          if (!mounted) return;
          setDailyLevelsData(json || {});
          const series = Array.isArray(json['totalstored-big6'])
            ? json['totalstored-big6']
            : [];
          setBig6Series(series);
        })
        .catch(err => {
          console.error('Error loading daily timeseries data:', err);
          setDailyLevelsData({});
          setBig6Series([]);
        });
    });
    return () => { mounted = false; };
  }, []);
  if (!features.length) return null;
  // derive Big 6 percentage for selected date (fallback to latest)
  const big6Entry = selectedDate
    ? big6Series.find(item => item.date === selectedDate)
    : null;
  const big6Latest = big6Entry || (big6Series.length > 0 ? big6Series[big6Series.length - 1] : null);
  const big6Pct = big6Latest?.percent_full != null
    ? parseFloat(big6Latest.percent_full)
    : null;
  const big6Rounded = big6Pct != null ? Math.round(big6Pct) : null;
  const big6Color = getBatteryColor(big6Rounded);
  // helper: derive key for timeseries lookup from dam name (match naming in JSON)
  function deriveKey(name) {
    const lower = (name || '').toLowerCase().replace(/\s*dam$/i, '');
    const noSpace = lower.replace(/\s+/g, '');
    const parts = noSpace.split('-').filter(Boolean);
    return parts.length > 1
      ? parts[0] + '-' + parts.slice(1).join('')
      : parts[0] || '';
  }
  // Build list of individual dams (excluding summary) that have timeseries entries
  const dams = features
    .filter(feature => {
      const props = feature.properties || {};
      const name = props.NAME;
      // skip summary features
      if (name === 'Big 6 Total' || name === 'Big 5 Total') return false;
      // require dailyLevelsData to be loaded
      if (!dailyLevelsData) return false;
      // lookup series array by key
      const key = deriveKey(name);
      const series = dailyLevelsData[key];
      return Array.isArray(series) && series.length > 0;
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
    // Determine coordinates for zoom: prefer centroid property (WKT or array), else fallback to polygon vertex
    let coords = null;
    if (typeof props.centroid === 'string') {
      // parse WKT 'POINT (lng lat)'
      const match = props.centroid.match(/POINT\s*\(\s*([^\s]+)\s+([^\s]+)\s*\)/);
      if (match) {
        const lng = parseFloat(match[1]);
        const lat = parseFloat(match[2]);
        if (!isNaN(lng) && !isNaN(lat)) coords = [lng, lat];
      }
    } else if (
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
          <h3 onClick={onClose}>Dam Levels</h3>
          {!isMobile && (
            <button className="dam-levels-close" onClick={onClose} aria-label="Close">×</button>
          )}
        </div>
        <ul className="dam-levels-list">
          {/* Summary total for Big 6 */}
          <li
            key="big6"
            className="dam-levels-item summary"
            onClick={() => {
              // select Big 6 summary for timeseries popup
              if (onSelectSummary) {
                onSelectSummary({
                  type: 'Feature',
                  properties: {
                    NAME: 'totalstored-big6',
                    current_percentage_full: big6Pct
                  }
                });
              }
              if (isMobile && onClose) onClose();
            }}
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
          {/* Individual dams */}
          {dams.map((d, i) => (
            <li
              key={i}
              className="dam-levels-item"
            onClick={() => {
                if (!d.coords) return;
                const isDoubleClick = lastClicked === d.name;
                const isPopupOpen = !!selectedFeature;
                if (onSelectDam) onSelectDam(d.coords);
                if ((isPopupOpen || isDoubleClick) && onSelectFeature) {
                  onSelectFeature(d.feature);
                }
                setLastClicked(d.name);
                if (isMobile && onClose) onClose();
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
// Export utility icon and color mapping for external use
export { BatteryIcon, getBatteryColor };