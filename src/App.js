import './App.css';

import React, { useState, useEffect, useMemo } from 'react';
import BasemapToggle from './components/BasemapToggle';
import DatePickerToggle from './components/DatePickerToggle';
import MapContainer from './components/MapContainer';
import DamPopup from './components/DamPopup';
import DamLevels, { BatteryIcon, getBatteryColor } from './components/DamLevels';
import ServiceAlerts from './components/ServiceAlerts';
import useIsMobile from './hooks/useIsMobile';
import { fetchFromStorage } from './firebase-config';

function App() {
  // Raw GeoJSON dam data
  const [data, setData] = useState(null);
  // Daily time-series data for dams
  const [dailyLevels, setDailyLevels] = useState(null);
  // Service alerts data
  const [serviceAlerts, setServiceAlerts] = useState({ planned: [], unplanned: [] });
  // Currently selected date for visualization (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/light-v10'); // mapbox://styles/mapbox/satellite-streets-v12
  const [selectedDam, setSelectedDam] = useState(null);
  const [showLevels, setShowLevels] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  // panTo: { coords: [lng, lat], zoom: number }
  const [panTo, setPanTo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();
  const [selectedServiceArea, setSelectedServiceArea] = useState(null);
  const [showDamLevelsLayer, setShowDamLevelsLayer] = useState(true); // Default: ON
  const [showServiceAlertsLayer, setShowServiceAlertsLayer] = useState(false); // Default: OFF

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Find the latest available date with data for a given dam
  const findLatestAvailableDate = (damKey) => {
    if (!dailyLevels || !dailyLevels[damKey]) return null;
    const series = dailyLevels[damKey];
    // Find the latest entry with percent_full data
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i].percent_full != null) {
        return series[i].date;
      }
    }
    return null;
  };

  useEffect(() => {
    let isMounted = true;
    
    async function loadData() {
      try {
        const [geoJson, levels, plannedAlerts, unplannedAlerts] = await Promise.all([
          fetchFromStorage('shapefiles/Bulk_Water_Dams_Enriched.geojson'),
          fetchFromStorage('timeseries/dam_levels_daily.json'),
          fetchFromStorage('service_alerts/service_alerts_planned.json'),
          fetchFromStorage('service_alerts/service_alerts_unplanned.json')
        ]);

        if (!isMounted) return;

        // Set data in a single batch update
        setData(geoJson);
        setDailyLevels(levels);
        setServiceAlerts({
          planned: plannedAlerts || [],
          unplanned: unplannedAlerts || []
        });
        // Set initial date to today
        setSelectedDate(getTodayDate());
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, []);

  // Derive GeoJSON features augmented with values for the selected date
  const processedData = useMemo(() => {
    if (!data || !dailyLevels || !selectedDate) return data;
    // Transform dam names to match time series keys
    const deriveKey = name => {
      const lower = (name || '').toLowerCase().replace(/\s*dam$/i, '');
      const noSpace = lower.replace(/\s+/g, '');
      const parts = noSpace.split('-').filter(Boolean);
      return parts.length > 1
        ? parts[0] + '-' + parts.slice(1).join('')
        : parts[0] || '';
    };
    // Augment each dam feature with current percentage
    const features = data.features.map(feature => {
      const props = { ...feature.properties };
      const key = deriveKey(props.NAME);
      const series = dailyLevels[key] || [];
      
      // First try to find data for selected date
      let entry = series.find(item => item.date === selectedDate);
      
      // If no data for selected date, find latest available data
      if (!entry || entry.percent_full == null) {
        const latestDate = findLatestAvailableDate(key);
        if (latestDate) {
          entry = series.find(item => item.date === latestDate);
        }
      }

      if (entry && entry.percent_full != null) {
        props.current_percentage_full = parseFloat(entry.percent_full);
        props.current_date = entry.date;
      }
      return { ...feature, properties: props };
    });
    return { ...data, features };
  }, [data, dailyLevels, selectedDate]);

  // Big 6 summary percentage based on selected date
  const big6Pct = useMemo(() => {
    if (dailyLevels && selectedDate && Array.isArray(dailyLevels['totalstored-big6'])) {
      // First try selected date
      let entry = dailyLevels['totalstored-big6'].find(item => item.date === selectedDate);
      
      // If no data for selected date, find latest available data
      if (!entry || entry.percent_full == null) {
        const latestDate = findLatestAvailableDate('totalstored-big6');
        if (latestDate) {
          entry = dailyLevels['totalstored-big6'].find(item => item.date === latestDate);
        }
      }

      if (entry && entry.percent_full != null) {
        return parseFloat(entry.percent_full);
      }
    }
    return null;
  }, [dailyLevels, selectedDate]);

  const big6Rounded = big6Pct != null ? Math.round(big6Pct) : null;
  const big6Color = getBatteryColor(big6Rounded);

  // Filter service alerts based on selected date
  const filteredServiceAlerts = useMemo(() => {
    if (!serviceAlerts || !selectedDate) return { planned: [], unplanned: [] };
    
    const allAlerts = [
      ...(serviceAlerts.planned || []).map(alert => ({
        ...alert,
        type: 'planned',
        date: alert.effective_date
      })),
      ...(serviceAlerts.unplanned || []).map(alert => ({
        ...alert,
        type: 'unplanned',
        date: alert.effective_date
      }))
    ];
    
    const filtered = allAlerts.filter(alert => {
      if (!alert.expiry_date || !alert.publish_date) return false;
      
      const expiryDate = alert.expiry_date.split('T')[0]; // Extract date part only
      const publishDate = alert.publish_date.split('T')[0]; // Extract date part only
      
      // Get yesterday's date
      const yesterday = new Date(selectedDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      // Show alerts that:
      // 1. Haven't expired yet OR expired yesterday (expiry_date >= yesterday)
      // 2. Have been published (publish_date <= selectedDate)
      return expiryDate >= yesterdayStr && publishDate <= selectedDate;
    });

    // Separate back into planned and unplanned
    return {
      planned: filtered.filter(alert => alert.type === 'planned'),
      unplanned: filtered.filter(alert => alert.type === 'unplanned')
    };
  }, [serviceAlerts, selectedDate]);

  // Calculate total number of filtered alerts
  const totalAlerts = useMemo(() => {
    if (!filteredServiceAlerts) return 0;
    return (filteredServiceAlerts.planned?.length || 0) + (filteredServiceAlerts.unplanned?.length || 0);
  }, [filteredServiceAlerts]);

  // Loading state: show spinner and message while data is being fetched
  if (isLoading) {
    return (
      <div className="App" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <img 
            src="dam_levels.png" 
            alt="Dam Levels" 
            style={{ 
              width: '64px', 
              height: '64px', 
              marginBottom: '16px', 
              display: 'block', 
              margin: '0 auto 16px' 
            }} 
          />
          <div>Loading utilities data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="App" style={{ position: 'relative', height: '100vh' }}>
      <BasemapToggle currentStyle={mapStyle} onChange={setMapStyle} />
      <DatePickerToggle selectedDate={selectedDate} onChange={setSelectedDate} />
      <div className="button-group">
        <div className="button-container">
          <button
            className="dam-levels-button"
            onClick={() => setShowLevels(open => !open)}
            aria-pressed={showLevels}
          >
            {/* Toggle switch for dam levels layer */}
            <div
              className={`inline-toggle ${showDamLevelsLayer ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowDamLevelsLayer(!showDamLevelsLayer);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDamLevelsLayer(!showDamLevelsLayer);
                }
              }}
              aria-pressed={showDamLevelsLayer}
            >
              <span className="toggle-slider"></span>
            </div>
            {/* Battery icon for Big 6 storage */}
            {big6Rounded != null && (
              <BatteryIcon
                percent={big6Rounded}
                color={big6Color}
                className="battery-icon"
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
          <button
            className="service-alerts-button"
            onClick={() => setShowAlerts(open => !open)}
            aria-pressed={showAlerts}
          >
            {/* Toggle switch for service alerts layer */}
            <div
              className={`inline-toggle ${showServiceAlertsLayer ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowServiceAlertsLayer(!showServiceAlertsLayer);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowServiceAlertsLayer(!showServiceAlertsLayer);
                }
              }}
              aria-pressed={showServiceAlertsLayer}
            >
              <span className="toggle-slider"></span>
            </div>
            {totalAlerts > 0 && (
              <span className="service-alerts-count">{totalAlerts}</span>
            )}
            Service Alerts
            {/* Chevron indicating expandable panel */}
            <svg className="service-alerts-chevron" width="10" height="6" viewBox="0 0 10 6">
              <path
                d="M1 1 L5 5 L9 1"
                stroke="currentColor"
                fill="none"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
      {/* Render map only when all data is ready */}
      {!isLoading && processedData && selectedDate && (
        <MapContainer
          data={processedData}
          serviceAlerts={filteredServiceAlerts}
          selectedDate={selectedDate}
          mapStyle={mapStyle}
          selectedDam={selectedDam}
          setSelectedDam={setSelectedDam}
          panTo={panTo}
          selectedServiceArea={selectedServiceArea}
          showDamLevelsLayer={showDamLevelsLayer}
          showServiceAlertsLayer={showServiceAlertsLayer}
          showLevels={showLevels}
          showAlerts={showAlerts}
        />
      )}
      {/* Show dam levels list after features are available */}
      {processedData && Array.isArray(processedData.features) && processedData.features.length > 0 && (
        <DamLevels
          data={processedData}
          dailyLevels={dailyLevels}
          selectedDate={selectedDate}
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
      {/* Show service alerts panel */}
      <ServiceAlerts
        data={filteredServiceAlerts}
        open={showAlerts}
        onClose={() => setShowAlerts(false)}
        onSelectArea={setSelectedServiceArea}
        selectedArea={selectedServiceArea}
      />
    </div>
  );
}

export default App;