import React, { useRef, useEffect, useState, useMemo, memo } from 'react';
import mapboxgl from 'mapbox-gl';
import useIsMobile from '../hooks/useIsMobile';
import 'mapbox-gl/dist/mapbox-gl.css';
import DamPopup from './DamPopup';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

const ICONS = [
  'water_sanitation_unplanned',
  'water_sanitation_planned',
  'roads_stormwater_unplanned',
  'roads_stormwater_planned',
  'refuse_unplanned',
  'refuse_planned',
  'parks_unplanned',
  'parks_planned',
  'licence_unplanned',
  'licence_planned',
  'electricity_unplanned',
  'electricity_planned'
];

function MapContainer({ data, serviceAlerts, selectedDate, mapStyle, onSelectDam, panTo, selectedServiceArea, showDamLevelsLayer, showServiceAlertsLayer, showLevels, showAlerts, selectedDam, setSelectedDam }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const cameraRef = useRef({ center: [18.665, -33.962], zoom: 8.4, pitch: 40, bearing: 0 });
  const [hoverInfo, setHoverInfo] = useState(null);
  const isMobile = useIsMobile();
  const hasAnimatedRef = useRef(false);

  // Calculate initial position for DamPopup based on panel states
  const damPopupInitialPos = useMemo(() => {
    if (showLevels) {
      return { x: 360, y: 10 }; // Position to the right of DamLevels panel (300px + 20px margin)
    } else if (showAlerts) {
      return { x: 360, y: 10 }; // Position to the right of ServiceAlerts panel (300px + 20px margin)
    } else {
      return { x: 260, y: 10 }; // Default position when no panels are open
    }
  }, [showLevels, showAlerts]);

  // Combine and filter service alerts for the selected date and service area
  const activeAlerts = useMemo(() => {
    if (!serviceAlerts) return [];
    const allAlerts = [
      ...(serviceAlerts.planned || []).map(alert => ({ ...alert, type: 'planned', date: alert.effective_date })),
      ...(serviceAlerts.unplanned || []).map(alert => ({ ...alert, type: 'unplanned', date: alert.effective_date }))
    ];
    if (!selectedServiceArea) return allAlerts;
    return allAlerts.filter(alert => alert.service_area === selectedServiceArea);
  }, [serviceAlerts, selectedServiceArea]);

  // Convert service alerts to GeoJSON
  const alertsGeoJson = useMemo(() => ({
    type: 'FeatureCollection',
    features: activeAlerts
      .filter(alert => alert.coordinates && typeof alert.coordinates.lng === 'number' && typeof alert.coordinates.lat === 'number')
      .map(alert => {
        let iconName = alert.service_area.toLowerCase();
        if (iconName === 'roads & stormwater') {
          iconName = 'roads_stormwater';
        } else {
          iconName = iconName
            .replace(/&/g, '')
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');
        }
        iconName = `${iconName}_${alert.type}`;
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [alert.coordinates.lng, alert.coordinates.lat]
          },
          properties: {
            ...alert,
            icon: iconName
          }
        };
      })
  }), [activeAlerts]);

  useEffect(() => {
    if (!data) return;
    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;
    const { center, zoom, pitch, bearing } = cameraRef.current;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center,
      zoom,
      pitch,
      bearing,
      attributionControl: false
    });

    // const hasAnimatedRef = useRef(false);

    map.on('load', () => {
      map.addControl(new mapboxgl.NavigationControl());
      // Enable 3D terrain
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14
      });
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
      // Add dam polygons as GeoJSON source
      map.addSource('dams', {
        type: 'geojson',
        data
      });
      // Add dam fill layer
      map.addLayer({
        id: 'dams-fill',
        type: 'fill',
        source: 'dams',
        paint: {
          'fill-color': [
            'case',
            ['<=', ['get', 'current_percentage_full'], 20], '#FF6961',
            ['<=', ['get', 'current_percentage_full'], 40], '#FFB54C',
            ['<=', ['get', 'current_percentage_full'], 60], '#F8D66D',
            ['<=', ['get', 'current_percentage_full'], 80], '#7ABD7E',
            '#8CD47E'
          ],
          'fill-opacity': 0.7
        }
      });
      // Add dam outline layer
      map.addLayer({
        id: 'dams-outline',
        type: 'line',
        source: 'dams',
        paint: {
          'line-color': '#000',
          'line-width': 1
        }
      });
      // Add service alerts as GeoJSON source
      map.addSource('service-alerts', {
        type: 'geojson',
        data: alertsGeoJson
      });
      // Load all icons and add as images
      ICONS.forEach(iconName => {
        const url = `/icons/${iconName}.png`;
        map.loadImage(url, (error, image) => {
          if (!error && !map.hasImage(iconName)) {
            map.addImage(iconName, image);
          }
        });
      });
      // Add symbol layer for service alerts
      map.addLayer({
        id: 'service-alerts-layer',
        type: 'symbol',
        source: 'service-alerts',
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': 0.15,
          'icon-allow-overlap': true,
          'icon-anchor': 'bottom',
          'icon-offset': [0, 0],
          'visibility': showServiceAlertsLayer ? 'visible' : 'none'
        }
      });

      // Mousemove for hover tooltips
      map.on('mousemove', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['dams-fill', 'service-alerts-layer']
        });
        if (!features.length) {
          setHoverInfo(null);
          map.getCanvas().style.cursor = '';
          return;
        }
        const feature = features[0];
        map.getCanvas().style.cursor = 'pointer';
        if (feature.layer.id === 'dams-fill') {
          const props = feature.properties;
          setHoverInfo({
            x: e.originalEvent.clientX,
            y: e.originalEvent.clientY,
            isServiceAlert: false,
            name: props.NAME,
            percent: props.current_percentage_full != null ? parseFloat(props.current_percentage_full) : null,
            date: props.current_date || null,
            location: props.LCTN || null,
            river: props.RVR || null,
            capacity: props.CPCT != null ? props.CPCT : null,
            construction: props.CNST || null
          });
        } else if (feature.layer.id === 'service-alerts-layer') {
          const props = feature.properties;
          setHoverInfo({
            x: e.originalEvent.clientX,
            y: e.originalEvent.clientY,
            isServiceAlert: true,
            title: props.title,
            type: props.type,
            serviceArea: props.service_area,
            area: props.area,
            location: props.location,
            date: props.publish_date ? props.publish_date.split('T')[0] : '',
            expiryDate: props.expiry_date ? props.expiry_date.split('T')[0] : '',
            description: props.description
          });
        }
      });

      // Mouseleave to hide tooltip
      map.on('mouseleave', 'dams-fill', () => setHoverInfo(null));
      map.on('mouseleave', 'service-alerts-layer', () => setHoverInfo(null));

      // Click for DamPopup (dams only) - only on desktop
      map.on('click', (e) => {
        // Only handle dam clicks on desktop (not mobile)
        if (isMobile) return;
        
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['dams-fill']
        });
        if (features.length) {
          setSelectedDam(features[0]);
        } else {
          setSelectedDam(null);
        }
      });

      // Animate to Cape Town after a short delay (only once)
      if (!hasAnimatedRef.current && !isMobile) {
        hasAnimatedRef.current = true;
        setTimeout(() => {
          map.flyTo({
            center: [18.750, -34.038], // Cape Town
            zoom: 10,
            pitch: 60,
            bearing: 30,
            speed: 0.5,
            curve: 1.5,
            essential: true
          });
        }, 1200);
      }
    });

    mapRef.current = map;
    return () => {
      if (mapRef.current) {
        const c = mapRef.current.getCenter();
        const z = mapRef.current.getZoom();
        const p = mapRef.current.getPitch();
        const b = mapRef.current.getBearing();
        cameraRef.current = { 
          center: [c.lng, c.lat], 
          zoom: z, 
          pitch: p, 
          bearing: b 
        };
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [data, mapStyle]);

  // Separate effect to update service alerts data without recreating the map
  useEffect(() => {
    if (mapRef.current && mapRef.current.getSource('service-alerts')) {
      mapRef.current.getSource('service-alerts').setData(alertsGeoJson);
    }
  }, [alertsGeoJson]);

  // Control dam levels layer visibility
  useEffect(() => {
    if (mapRef.current) {
      const damFillLayer = mapRef.current.getLayer('dams-fill');
      const damOutlineLayer = mapRef.current.getLayer('dams-outline');
      
      if (damFillLayer && damOutlineLayer) {
        if (showDamLevelsLayer) {
          mapRef.current.setLayoutProperty('dams-fill', 'visibility', 'visible');
          mapRef.current.setLayoutProperty('dams-outline', 'visibility', 'visible');
        } else {
          mapRef.current.setLayoutProperty('dams-fill', 'visibility', 'none');
          mapRef.current.setLayoutProperty('dams-outline', 'visibility', 'none');
        }
      }
    }
  }, [showDamLevelsLayer]);

  // Control service alerts layer visibility
  useEffect(() => {
    if (mapRef.current) {
      const serviceAlertsLayer = mapRef.current.getLayer('service-alerts-layer');
      
      if (serviceAlertsLayer) {
        if (showServiceAlertsLayer) {
          mapRef.current.setLayoutProperty('service-alerts-layer', 'visibility', 'visible');
        } else {
          mapRef.current.setLayoutProperty('service-alerts-layer', 'visibility', 'none');
        }
      }
    }
  }, [showServiceAlertsLayer]);

  // Pan/fly to external coordinate when requested
  useEffect(() => {
    if (mapRef.current && panTo && Array.isArray(panTo.coords)) {
      const [lng, lat] = panTo.coords;
      mapRef.current.flyTo({ center: [lng, lat], zoom: panTo.zoom });
    }
  }, [panTo]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div ref={mapContainer} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      {hoverInfo && (
        <div
          className="map-tooltip"
          style={{
            position: 'fixed',
            left: Math.min(hoverInfo.x + 10, window.innerWidth - 320),
            top: Math.min(hoverInfo.y + 10, window.innerHeight - 220),
            zIndex: 1000,
            backgroundColor: 'white',
            padding: '12px',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            width: '280px',
            maxWidth: '280px',
            pointerEvents: 'none',
            border: '1px solid #ccc',
            wordWrap: 'break-word',
            overflow: 'hidden'
          }}
        >
          {hoverInfo.isServiceAlert ? (
            <div style={{ width: '100%' }}>
              <div style={{ marginBottom: '8px', fontSize: '16px', lineHeight: '1.2', color: '#333', wordBreak: 'break-word' }}>
                <strong>{hoverInfo.title}</strong>
              </div>
              <div style={{ marginBottom: '4px', fontSize: '14px', wordBreak: 'break-word' }}> {hoverInfo.area}, {hoverInfo.location}</div>
              <div style={{ marginBottom: '4px', fontSize: '14px' }}><strong>Type:</strong> {hoverInfo.type}</div>
              <div style={{ marginBottom: '4px', fontSize: '14px' }}><strong>Publish Date:</strong> {hoverInfo.date}</div>
              <div style={{ marginBottom: '4px', fontSize: '14px' }}><strong>Expiry Date:</strong> {hoverInfo.expiryDate}</div>
              <div style={{ marginTop: '8px', fontSize: '14px', color: '#666', wordBreak: 'break-word' }}>{hoverInfo.description}</div>
            </div>
          ) : (
            <div style={{ width: '100%' }}>
              <div style={{ marginBottom: '8px', fontSize: '16px', lineHeight: '1.2', color: '#333', wordBreak: 'break-word' }}>
                <strong>{hoverInfo.name}</strong>
              </div>
              <div style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>
                {hoverInfo.percent != null
                  ? `${Math.round(hoverInfo.percent)}%${hoverInfo.date ? ` (${hoverInfo.date})` : ''}`
                  : 'N/A'}
              </div>
              <div style={{ marginBottom: '4px', fontSize: '14px' }}><strong>Location:</strong> {hoverInfo.location || 'N/A'}</div>
              <div style={{ marginBottom: '4px', fontSize: '14px' }}><strong>River:</strong> {hoverInfo.river || 'N/A'}</div>
              <div style={{ marginBottom: '4px', fontSize: '14px' }}>
                <strong>Capacity:</strong>{' '}
                {hoverInfo.capacity != null
                  ? `${hoverInfo.capacity.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ML`
                  : 'N/A'}
              </div>
              <div style={{ fontSize: '14px' }}><strong>Constructed:</strong> {hoverInfo.construction || 'N/A'}</div>
            </div>
          )}
        </div>
      )}
      {selectedDam && (
        <DamPopup
          dam={selectedDam}
          onClose={() => setSelectedDam(null)}
          initialPos={damPopupInitialPos}
        />
      )}
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(MapContainer);