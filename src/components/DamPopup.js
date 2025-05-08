import React from 'react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

function DamPopup({ dam, onClose }) {
  const props = dam.properties || {};
  // use the timeseries array from the feature properties
  const timeseries = Array.isArray(props.timeseries) ? props.timeseries : [];
  // fallback single-value
  const current = props.current_percentage_full != null
    ? parseFloat(props.current_percentage_full)
    : null;

  // prepare chart data if timeseries exists
  const labels = timeseries.map(item => item.date);
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
      borderColor: 'rgba(75,192,192,0.5)'
    });
    // last year percentage
    data.datasets.push({
      label: 'Last Year %',
      data: timeseries.map(item => item.last_year_percent_full ?? null),
      fill: false,
      backgroundColor: 'rgb(192,75,75)',
      borderColor: 'rgba(192,75,75,0.5)'
    });
  }

  return (
    <div style={{ position: 'absolute', right: 10, top: 10, width: '300px', background: 'white', padding: '10px', borderRadius: '4px', zIndex: 10 }}>
      <button onClick={onClose} style={{ float: 'right' }}>Close</button>
      <h3>{dam.properties.NAME}</h3>
      {timeseries.length ? (
        <Line data={data} />
      ) : current != null ? (
        <p>Current: {current}% full</p>
      ) : (
        <p>No storage time-series data available.</p>
      )}
    </div>
  );
}

export default DamPopup;