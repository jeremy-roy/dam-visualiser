import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer } from '@deck.gl/layers';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

function MapContainer({ data, mapStyle, onSelectDam, panTo }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [hoverInfo, setHoverInfo] = useState(null);

  useEffect(() => {
    if (!data) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [18.0, -33.0],
      zoom: 8
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
            if (percent == null || isNaN(percent)) {
              return [200, 200, 200, 150];
            }
            const p = percent / 100;
            const r = Math.round(255 * (1 - p));
            const g = Math.round(255 * p);
            return [r, g, 0, 200];
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
          setHoverInfo({ x: e.point.x, y: e.point.y, name: props.NAME, percent });
        } else {
          setHoverInfo(null);
        }
      });
    });
    // keep map instance for external control
    mapRef.current = map;


    return () => {
      map.remove();
      mapRef.current = null;
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
          background: 'white',
          padding: '4px',
          borderRadius: '4px',
          fontFamily: "'Nunito', sans-serif"
        }}>
          <div><strong>{hoverInfo.name}</strong></div>
          <div>{hoverInfo.percent != null ? `${Math.round(hoverInfo.percent)}% full` : 'N/A'}</div>
        </div>
      )}
    </div>
  );
}

export default MapContainer;