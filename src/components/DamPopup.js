import React, { useState, useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import './DamPopup.css';

function DamPopup({ dam, onClose }) {
  const props = dam.properties || {};
  // use the timeseries array from the feature properties
  const timeseries = Array.isArray(props.timeseries) ? props.timeseries : [];
  // filter range: '1y', '5y', or 'all'
  const [range, setRange] = useState('all');
  // compute filtered timeseries based on selected range
  const now = new Date();
  const cutoffDate = new Date(now);
  if (range === '1y') {
    cutoffDate.setFullYear(now.getFullYear() - 1);
  } else if (range === '5y') {
    cutoffDate.setFullYear(now.getFullYear() - 5);
  }
  const filteredTimeseries = range === 'all'
    ? timeseries
    : timeseries.filter(item => new Date(item.date) >= cutoffDate);
  // fallback single-value
  const current = props.current_percentage_full != null
    ? parseFloat(props.current_percentage_full)
    : null;

  // prepare chart data if timeseries exists (apply range filter)
  // Extract x-axis labels based on selected range
  let labels;
  if (range === 'all') {
    labels = filteredTimeseries.map(item => {
      const date = new Date(item.date);
      return date.getFullYear().toString();
    });
  } else {
    labels = filteredTimeseries.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    });
  }
  const data = {
    labels,
    datasets: []
  };
  if (filteredTimeseries.length) {
    // current year percentage
    data.datasets.push({
      label: '% Full',
      data: filteredTimeseries.map(item => item.percentagepercent_full ?? item.percent_full ?? null),
      fill: false,
      backgroundColor: 'rgb(75,192,192)',
      borderColor: 'rgba(75,192,192,0.5)',
      pointRadius: 0,
      pointHoverRadius: 3,
      // smooth curves
      tension: 0.4,
      cubicInterpolationMode: 'monotone',
      spanGaps: true
    });
    // last year percentage
    data.datasets.push({
      label: 'Last Year %',
      data: filteredTimeseries.map(item => item.last_year_percent_full ?? null),
      fill: false,
      backgroundColor: 'rgb(192,75,75)',
      borderColor: 'rgba(192,75,75,0.5)',
      pointRadius: 0,
      pointHoverRadius: 3,
      // smooth curves
      tension: 0.4,
      cubicInterpolationMode: 'monotone',
      spanGaps: true
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
        // include first and last labels on the category axis
        type: 'category',
        offset: true,
        bounds: 'ticks',
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
      },
      tooltip: {
        callbacks: {
          // Show full date as title
          title: context => {
            const idx = context[0]?.dataIndex;
            if (idx == null) return '';
            const raw = filteredTimeseries[idx]?.date;
            // Format date string
            return raw ? new Date(raw).toLocaleDateString() : '';
          },
          // Show value to 2 decimal places
          label: context => {
            const v = context.raw;
            if (v == null) return '';
            return `${v.toFixed(2)}% full`;
          }
        }
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
        <>
          <div className="dam-popup-filters">
            <button
              className={`dam-popup-filter-button ${range === '1y' ? 'active' : ''}`}
              onClick={() => setRange('1y')}
            >
              1 Year
            </button>
            <button
              className={`dam-popup-filter-button ${range === '5y' ? 'active' : ''}`}
              onClick={() => setRange('5y')}
            >
              5 Years
            </button>
            <button
              className={`dam-popup-filter-button ${range === 'all' ? 'active' : ''}`}
              onClick={() => setRange('all')}
            >
              All Time
            </button>
          </div>
          {filteredTimeseries.length ? (
            <div style={{ height: '300px' }}>
              <Line data={data} options={options} />
            </div>
          ) : (
            <p>No data for selected range.</p>
          )}
        </>
      ) : current != null ? (
        <p>Current: {Math.round(current)}% full</p>
      ) : (
        <p>No storage time-series data available.</p>
      )}
    </div>
  );
}

export default DamPopup;