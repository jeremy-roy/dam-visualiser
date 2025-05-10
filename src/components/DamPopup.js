import React, { useState, useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import './DamPopup.css';

function DamPopup({ dam, onClose }) {
  const props = dam.properties || {};
  // use the timeseries array from the feature properties
  const timeseries = Array.isArray(props.timeseries) ? props.timeseries : [];
  // fallback single-value
  const current = props.current_percentage_full != null
    ? parseFloat(props.current_percentage_full)
    : null;

  // prepare chart data if timeseries exists
  // Extract years for x-axis labels
  const labels = timeseries.map(item => {
    const date = new Date(item.date);
    return date.getFullYear();
  });
  const data = {
    labels,
    datasets: []
  };
  if (timeseries.length) {
    // current year percentage
    data.datasets.push({
      label: '% Full',
      data: timeseries.map(item => item.percentagepercent_full ?? item.percent_full ?? null),
      fill: false,
      backgroundColor: 'rgb(75,192,192)',
      borderColor: 'rgba(75,192,192,0.5)',
      pointRadius: 0,
      pointHoverRadius: 3
    });
    // last year percentage
    data.datasets.push({
      label: 'Last Year %',
      data: timeseries.map(item => item.last_year_percent_full ?? null),
      fill: false,
      backgroundColor: 'rgb(192,75,75)',
      borderColor: 'rgba(192,75,75,0.5)',
      pointRadius: 0,
      pointHoverRadius: 3
    });
  }

  // Drag state
  const popupRef = useRef(null);
  const [pos, setPos] = useState({ x: 10, y: 10 });
  const [dragging, setDragging] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 });

  useEffect(() => {
    function handleMouseMove(e) {
      if (!dragging) return;
      setPos({ x: e.clientX - rel.x, y: e.clientY - rel.y });
      e.preventDefault();
    }
    function handleMouseUp() {
      setDragging(false);
    }
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, rel]);

  function handleMouseDown(e) {
    if (e.button !== 0) return;
    const rect = popupRef.current.getBoundingClientRect();
    setDragging(true);
    setRel({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    e.preventDefault();
  }

  // Chart display options: show yearly ticks, limit number of labels
  const options = {
    scales: {
      x: {
        ticks: {
          autoSkip: true,
          maxTicksLimit: 10,
        },
        title: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        position: 'top'
      }
    },
    maintainAspectRatio: false
  };

  return (
    <div
      ref={popupRef}
      className={`dam-popup${dragging ? ' dragging' : ''}`}
      style={{ left: pos.x, top: pos.y }}
    >
      <div className="dam-popup-header" onMouseDown={handleMouseDown}>
        <h3>{props.NAME}</h3>
        <button onClick={onClose} className="dam-popup-close-button" aria-label="Close popup">×</button>
      </div>
      {timeseries.length ? (
        // Render chart with yearly x-axis
        <div style={{ height: '300px' }}>
          <Line data={data} options={options} />
        </div>
      ) : current != null ? (
        <p>Current: {current}% full</p>
      ) : (
        <p>No storage time-series data available.</p>
      )}
    </div>
  );
}

export default DamPopup;