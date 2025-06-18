import React, { useMemo } from 'react';
import './ServiceAlerts.css';
import useIsMobile from '../hooks/useIsMobile';

function ServiceAlerts({ data, open, onClose }) {
  const isMobile = useIsMobile();

  // Get unique service areas and count alerts for each
  const serviceAreas = useMemo(() => {
    if (!data) return [];
    
    const allAlerts = [
      ...(data.planned || []),
      ...(data.unplanned || [])
    ];
    
    // Get unique service areas and count alerts
    const areas = [...new Set(allAlerts.map(alert => alert.service_area))];
    return areas.map(area => ({
      name: area,
      count: allAlerts.filter(alert => alert.service_area === area).length
    })).sort((a, b) => b.count - a.count); // Sort by count descending
  }, [data]);

  // Calculate total alerts
  const totalAlerts = useMemo(() => {
    if (!data) return 0;
    return (data.planned?.length || 0) + (data.unplanned?.length || 0);
  }, [data]);

  if (!open) return null;

  return (
    <div className="service-alerts-overlay">
      <div className={`service-alerts-panel${open ? ' open' : ''}`}>
        <div className="service-alerts-header">
          <h3 onClick={onClose}>Service Alerts</h3>
          {!isMobile && (
            <button className="service-alerts-close" onClick={onClose} aria-label="Close">×</button>
          )}
        </div>
        <ul className="service-alerts-list">
          <li className="service-alerts-item total-item">
            <span className="service-area-name">
              All Service Alerts
            </span>
            <span className="service-alert-count">
              {totalAlerts}
            </span>
          </li>
          {serviceAreas.map((area, i) => (
            <li
              key={i}
              className="service-alerts-item"
            >
              <span className="service-area-name">
                {area.name}
              </span>
              <span className="service-alert-count">
                {area.count}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ServiceAlerts;
