import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer } from '@deck.gl/layers';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

function MapContainer({ data, mapStyle, onSelectDam, panTo }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  // store last camera position across style changes (default starting view)
  const cameraRef = useRef({ center: [18.665421839045592, -33.96235129043437], zoom: 8.4 });
  const [hoverInfo, setHoverInfo] = useState(null);

  useEffect(() => {
    if (!data) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    // initialize map with last known camera
    const { center, zoom } = cameraRef.current;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center,
      zoom
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
        })
      ],
      // Disable Deck.GL default tooltips; use custom React hover tooltip
      getTooltip: () => null
    });

    map.on('load', () => {
      map.addControl(new mapboxgl.NavigationControl());
      map.addControl(overlay);

      // Attach picking events after overlay is initialized
      map.on('click', (e) => {
        const info = overlay.pickObject({ x: e.point.x, y: e.point.y });
        if (info && info.object) {
          onSelectDam(info.object);
        }
      });

      map.on('mousemove', (e) => {
        const info = overlay.pickObject({ x: e.point.x, y: e.point.y });
        if (info && info.object) {
          const props = info.object.properties || {};
          let percent = null;
          // time-series
          if (Array.isArray(props.storage_levels) && props.storage_levels.length) {
            const latest = props.storage_levels[props.storage_levels.length - 1];
            percent = latest && latest.percent_full;
          }
          // fallback single value
          else if (props.current_percentage_full != null) {
            percent = parseFloat(props.current_percentage_full);
          }
          // build hover info with additional properties
          setHoverInfo({
            x: e.point.x,
            y: e.point.y,
            name: props.NAME,
            percent,
            date: props.current_date || null,
            location: props.LCTN || null,
            river: props.RVR || null,
            wtw: props.WTW || null,
            capacity: props.CPCT != null ? props.CPCT : null,
            construction: props.CNST || null
          });
        } else {
          setHoverInfo(null);
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
  }, [data, mapStyle, onSelectDam]);

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
        <div style={{
          position: 'absolute',
          left: hoverInfo.x,
          top: hoverInfo.y,
          zIndex: 9,
          pointerEvents: 'none',
          background: '#fff',
          padding: '8px',
          borderRadius: '4px',
          fontFamily: "'Nunito', sans-serif",
          fontSize: '14px',
          textAlign: 'left',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
        }}>
          <div style={{ marginBottom: '4px', fontSize: '16px', lineHeight: '1.2' }}>
            <strong>{hoverInfo.name}</strong>
          </div>
          <div style={{ marginBottom: '4px' }}>
            {hoverInfo.percent != null
              ? `${Math.round(hoverInfo.percent)}%${hoverInfo.date ? ` (${hoverInfo.date})` : ''}`
              : 'N/A'}
          </div>
          <div style={{ marginBottom: '2px' }}><strong>Location:</strong> {hoverInfo.location || 'N/A'}</div>
          <div style={{ marginBottom: '2px' }}><strong>River:</strong> {hoverInfo.river || 'N/A'}</div>
          {/* <div style={{ marginBottom: '2px' }}><strong>Water Treatment:</strong> {hoverInfo.wtw || 'N/A'}</div> */}
          <div style={{ marginBottom: '2px' }}>
            <strong>Capacity:</strong>{' '}
            {hoverInfo.capacity != null
              ? `${hoverInfo.capacity.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ML`
              : 'N/A'}
          </div>
          <div><strong>Constructed:</strong> {hoverInfo.construction || 'N/A'}</div>
        </div>
      )}
    </div>
  );
}

export default MapContainer;