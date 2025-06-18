import React, { useRef, useEffect, useState, useMemo, memo } from 'react';
import mapboxgl from 'mapbox-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer, IconLayer } from '@deck.gl/layers';
import useIsMobile from '../hooks/useIsMobile';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

function MapContainer({ data, serviceAlerts, selectedDate, mapStyle, onSelectDam, panTo, selectedDam }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  // store last camera position across style changes (default starting view)
  const cameraRef = useRef({ center: [18.665421839045592, -33.96235129043437], zoom: 8.4 });
  const [hoverInfo, setHoverInfo] = useState(null);
  const isMobile = useIsMobile();

  // Combine and filter service alerts for the selected date
  const activeAlerts = useMemo(() => {
    if (!serviceAlerts) return [];
    
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
    
    return allAlerts;
  }, [serviceAlerts, selectedDate]);

  useEffect(() => {
    if (!data) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    // initialize map with last known camera
    const { center, zoom } = cameraRef.current;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center,
      zoom,
      // Disable default Mapbox attribution links
      attributionControl: false
    });

    const overlay = new MapboxOverlay({
      layers: [
        new GeoJsonLayer({
          id: 'dams-layer',
          data,
          pickable: true,
          stroked: true,
          filled: true,
          getFillColor: feature => {
            const props = feature.properties || {};
            let percent = null;
            // Get percentage either from time series or static property
            if (Array.isArray(props.storage_levels) && props.storage_levels.length) {
              const latest = props.storage_levels[props.storage_levels.length - 1];
              percent = latest && latest.percent_full;
            } else if (props.current_percentage_full != null) {
              percent = parseFloat(props.current_percentage_full);
            }
            // no data: light grey
            if (percent == null || isNaN(percent)) {
              return [200, 200, 200, 150];
            }
            const p = percent;
            // discrete color bands (5)
            if (p <= 20) {
              return [0xFF, 0x69, 0x61, 200];  // #FF6961 (red)
            } else if (p <= 40) {
              return [0xFF, 0xB5, 0x4C, 200];  // #FFB54C (amber)
            } else if (p <= 60) {
              return [0xF8, 0xD6, 0x6D, 200];  // #F8D66D (light-yellow)
            } else if (p <= 80) {
              return [0x7A, 0xBD, 0x7E, 200];  // #7ABD7E (light-green)
            } else {
              return [0x8C, 0xD4, 0x7E, 200];  // #8CD47E (green)
            }
          },
          getLineColor: [0, 0, 0, 255],
          getLineWidth: 10
        }),
        new IconLayer({
          id: 'service-alerts-layer',
          data: activeAlerts,
          pickable: true,
          getIcon: d => {
            const iconName = d.service_area.toLowerCase().replace(/&/g, '').replace(/\s+/g, '_');
            const iconUrl = `/icons/${iconName}_${d.type}.png`;
            console.log('Creating icon for alert:', { 
              title: d.title,
              type: d.type,
              service_area: d.service_area,
              coordinates: d.coordinates,
              iconUrl 
            });
            return {
              url: iconUrl,
              width: 128,
              height: 128,
              anchorX: 64,  // Center horizontally (half of width)
              anchorY: 128  // Bottom of icon
            };
          },
          getPosition: d => {
            return [d.coordinates.lng, d.coordinates.lat];
          },
          getSize: d => 36, // Made icons even bigger
          sizeScale: 1,
          sizeUnits: 'pixels',
          updateTriggers: {
            getIcon: [selectedDate],
            getPosition: [selectedDate]
          },
          // Disable Deck.GL default tooltips; use custom React hover tooltip
          getTooltip: () => null
        })
      ]
    });

    map.on('load', () => {
      map.addControl(new mapboxgl.NavigationControl());
      map.addControl(overlay);

      // Attach picking events after overlay is initialized
      map.on('click', (e) => {
        const info = overlay.pickObject({ x: e.point.x, y: e.point.y });
        if (!info || !info.object) {
          setHoverInfo(null);
          return;
        }

        if (!isMobile) {
          // Desktop behavior:
          // For dams: show popup and clear tooltip
          // For service alerts: do nothing (keep hover state)
          if (info.object.properties && info.object.properties.NAME) { // It's a dam
            setHoverInfo(null);
            onSelectDam(info.object);
          }
          return;
        }

        // Handle mobile clicks - show tooltips for both types
        if (info.object.type === 'planned' || info.object.type === 'unplanned') {
          // It's a service alert
          const alert = info.object;
          
          // Position tooltip below Dam Levels button, same as dam tooltips
          let x = 20, y = 60;
          const btn = document.querySelector('.dam-levels-button');
          if (btn) {
            const rect = btn.getBoundingClientRect();
            x = rect.left;
            y = rect.bottom + 4; // small margin below button
          }

          setHoverInfo({
            x,
            y,
            isServiceAlert: true,
            title: alert.title,
            type: alert.type,
            serviceArea: alert.service_area,
            area: alert.area,
            location: alert.location,
            date: alert.publish_date?.split('T')[0],
            expiryDate: alert.expiry_date?.split('T')[0],
            description: alert.description
          });
        } else if (info.object.properties && info.object.properties.NAME) {
          // It's a dam - show tooltip below Dam Levels button
          const props = info.object.properties;
          const percent = props.current_percentage_full != null 
            ? parseFloat(props.current_percentage_full) 
            : null;

          // compute tooltip position: align under the Dam Levels button
          let x = 20, y = 60;
          const btn = document.querySelector('.dam-levels-button');
          if (btn) {
            const rect = btn.getBoundingClientRect();
            x = rect.left;
            y = rect.bottom + 4; // small margin below button
          }
          
          setHoverInfo({
            x,
            y,
            isServiceAlert: false,
            name: props.NAME,
            percent,
            date: props.current_date || null,
            location: props.LCTN || null,
            river: props.RVR || null,
            capacity: props.CPCT != null ? props.CPCT : null,
            construction: props.CNST || null
          });
        }
      });

      map.on('mousemove', (e) => {
        if (isMobile) return;
        
        const info = overlay.pickObject({ x: e.point.x, y: e.point.y });
        const canvas = map.getCanvas();
        
        if (!info || !info.object) {
          canvas.style.cursor = '';
          setHoverInfo(null);
          return;
        }

        // Always show pointer cursor on hover
        canvas.style.cursor = 'pointer';
        
        // Debug log to see what we're picking
        console.log('Picked object:', info.object);
        
        // Check if it's a service alert by looking for the type property and service_area
        if (info.object.type === 'planned' || info.object.type === 'unplanned') {
          // It's a service alert
          const alert = info.object;
          setHoverInfo({
            x: e.point.x,
            y: e.point.y,
            isServiceAlert: true,
            title: alert.title,
            type: alert.type,
            serviceArea: alert.service_area,
            area: alert.area,
            location: alert.location,
            date: alert.publish_date?.split('T')[0],
            expiryDate: alert.expiry_date?.split('T')[0],
            description: alert.description
          });
        } else if (info.object.properties && info.object.properties.NAME) {
          // It's a dam
          const props = info.object.properties;
          let percent = null;
          if (Array.isArray(props.storage_levels) && props.storage_levels.length) {
            const latest = props.storage_levels[props.storage_levels.length - 1];
            percent = latest && latest.percent_full;
          }
          // fallback single value
          else if (props.current_percentage_full != null) {
            percent = parseFloat(props.current_percentage_full);
          }
          setHoverInfo({
            x: e.point.x,
            y: e.point.y,
            isServiceAlert: false,
            name: props.NAME,
            percent,
            date: props.current_date || null,
            location: props.LCTN || null,
            river: props.RVR || null,
            wtw: props.WTW || null,
            capacity: props.CPCT != null ? props.CPCT : null,
            construction: props.CNST || null
          });
        }
      });
    });

    // keep map instance for external control
    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        // save camera position
        const c = mapRef.current.getCenter();
        cameraRef.current = { center: [c.lng, c.lat], zoom: mapRef.current.getZoom() };
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [data, mapStyle, onSelectDam, activeAlerts, isMobile, selectedDam]);

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
            position: 'absolute',
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
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(MapContainer);