import React from 'react';
import './DamLevels.css';

// Panel showing list of dams and their current % full
function DamLevels({ data, onClose }) {
  if (!data || !Array.isArray(data.features)) return null;
  // Build list of dams with current percentage
  const dams = data.features.map(feature => {
    const props = feature.properties || {};
    let percent = null;
    // try storage_levels time-series
    if (Array.isArray(props.storage_levels) && props.storage_levels.length) {
      const latest = props.storage_levels[props.storage_levels.length - 1];
      percent = latest && latest.percent_full;
    } else if (props.current_percentage_full != null) {
      percent = parseFloat(props.current_percentage_full);
    }
    return {
      name: props.NAME || 'Unknown',
      percent: percent != null && !isNaN(percent) ? Math.round(percent) : null,
    };
  });
  return (
    <div className="dam-levels-overlay">
      <div className="dam-levels-panel">
        <div className="dam-levels-header">
          <h3>Dam Levels</h3>
          <button className="dam-levels-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <ul className="dam-levels-list">
          {dams.map((d, i) => (
            <li key={i} className="dam-levels-item">
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