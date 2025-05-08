import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer } from '@deck.gl/layers';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

function MapContainer({ data, mapStyle, onSelectDam }) {
  const mapContainer = useRef(null);
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
            // try time-series storage_levels
            if (Array.isArray(props.storage_levels) && props.storage_levels.length) {
              const latest = props.storage_levels[props.storage_levels.length - 1];
              percent = latest && latest.percent_full;
            }
            // fallback to single current_percentage_full
            else if (props.current_percentage_full != null) {
              percent = parseFloat(props.current_percentage_full);
            }
            // no valid percentage: grey
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
      getTooltip: info => {
        if (info.object) {
          const props = info.object.properties || {};
          const name = props.NAME || '';
          let label = 'N/A';
          // try time-series
          if (Array.isArray(props.storage_levels) && props.storage_levels.length) {
            const latest = props.storage_levels[props.storage_levels.length - 1];
            if (latest && latest.percent_full != null) {
              label = `${latest.percent_full}% full`;
            }
          }
          // fallback single value
          else if (props.current_percentage_full != null) {
            label = `${parseFloat(props.current_percentage_full)}% full`;
          }
          return `${name}: ${label}`;
        }
        return null;
      }
    });

    map.on('load', () => {
      map.addControl(new mapboxgl.NavigationControl());
      map.addControl(overlay);
    });

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

    return () => map.remove();
  }, [data, mapStyle, onSelectDam]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div ref={mapContainer} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      {hoverInfo && (
        <div style={{ position: 'absolute', left: hoverInfo.x, top: hoverInfo.y, zIndex: 9, pointerEvents: 'none', background: 'white', padding: '4px', borderRadius: '4px' }}>
          <div><strong>{hoverInfo.name}</strong></div>
          <div>{hoverInfo.percent != null ? `${hoverInfo.percent}% full` : 'N/A'}</div>
        </div>
      )}
    </div>
  );
}

export default MapContainer;