import React, { useState, useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import './DamPopup.css';

function DamPopup({ dam, onClose, initialPos }) {
  const props = dam.properties || {};
  // human-friendly name for display (map summary keys to labels)
  const rawName = props.NAME;
  const displayName = rawName === 'totalstored-big6'
    ? 'Big 6 Total'
    : rawName;
  // full timeseries data: daily and monthly for dam, plus rainfall and population
  const [allDailyData, setAllDailyData] = useState(null);
  const [allMonthlyData, setAllMonthlyData] = useState(null);
  // per-dam series arrays
  const [dailySeries, setDailySeries] = useState([]);
  const [monthlySeries, setMonthlySeries] = useState([]);
  // rainfall and population series arrays
  const [rainDailyData, setRainDailyData] = useState([]);
  const [rainMonthlyData, setRainMonthlyData] = useState([]);
  const [popYearData, setPopYearData] = useState([]);
  // expanded chart toggle
  const [expanded, setExpanded] = useState(false);
  // fetch daily data
  useEffect(() => {
    fetch(process.env.PUBLIC_URL + '/timeseries/dam_levels_daily.json')
      .then(res => res.json())
      .then(data => setAllDailyData(data))
      .catch(err => {
        console.error('Error loading daily timeseries data:', err);
        setAllDailyData({});
      });
  }, []);
  // fetch monthly data
  useEffect(() => {
    fetch(process.env.PUBLIC_URL + '/timeseries/dam_levels_monthly.json')
      .then(res => res.json())
      .then(data => setAllMonthlyData(data))
      .catch(err => {
        console.error('Error loading monthly timeseries data:', err);
        setAllMonthlyData({});
      });
  }, []);
  // fetch rainfall daily data
  useEffect(() => {
    fetch(process.env.PUBLIC_URL + '/timeseries/cape_town_rainfall_daily.json')
      .then(res => res.json())
      .then(data => setRainDailyData(data))
      .catch(err => {
        console.error('Error loading rainfall daily:', err);
        setRainDailyData([]);
      });
  }, []);
  // fetch rainfall monthly data
  useEffect(() => {
    fetch(process.env.PUBLIC_URL + '/timeseries/cape_town_rainfall_monthly.json')
      .then(res => res.json())
      .then(data => setRainMonthlyData(data))
      .catch(err => {
        console.error('Error loading rainfall monthly:', err);
        setRainMonthlyData([]);
      });
  }, []);
  // fetch population yearly data
  useEffect(() => {
    fetch(process.env.PUBLIC_URL + '/timeseries/cape_town_population_yearly.json')
      .then(res => res.json())
      .then(data => {
        // convert to date format for lookup
        const series = data.map(item => ({ date: `${item.year}-01-01`, population: item.population }));
        setPopYearData(series);
      })
      .catch(err => {
        console.error('Error loading population yearly:', err);
        setPopYearData([]);
      });
  }, []);
  // derive daily and monthly series for this dam
  useEffect(() => {
    if (!allDailyData || !allMonthlyData) return;
    // derive key from dam name: lowercase, drop trailing ' Dam', remove spaces
    // keep only first hyphen (e.g. 'land-en-zeezicht')
    const name = (props.NAME || '').toLowerCase().replace(/\s*dam$/i, '');
    const noSpace = name.replace(/\s+/g, '');
    const parts = noSpace.split('-').filter(Boolean);
    const key = parts.length > 1
      ? parts[0] + '-' + parts.slice(1).join('')
      : parts[0] || '';
    // select series or empty
    const daily = Array.isArray(allDailyData[key]) ? allDailyData[key] : [];
    const monthly = Array.isArray(allMonthlyData[key]) ? allMonthlyData[key] : [];
    setDailySeries(daily);
    setMonthlySeries(monthly);
  }, [allDailyData, allMonthlyData, props.NAME]);
  // filter range: '1y', '5y', or 'all'
  const [range, setRange] = useState('all');
  // pick daily or monthly series based on range
  const timeseries = range === '1y' ? dailySeries : monthlySeries;
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
  // align rainfall and population data to dam time points
  const rawRain = range === '1y' ? rainDailyData : rainMonthlyData;
  const rainLookup = {};
  rawRain.forEach(item => { rainLookup[item.date] = item.prcp; });
  const rainData = filteredTimeseries.map(item => {
    const v = rainLookup[item.date];
    return v != null ? parseFloat(v) : null;
  });
  const popLookup = {};
  popYearData.forEach(item => { popLookup[item.date.slice(0, 4)] = item.population; });
  const popData = filteredTimeseries.map(item => {
    const yr = new Date(item.date).getFullYear().toString();
    const v = popLookup[yr];
    return v != null ? parseFloat(v) : null;
  });
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
      data: filteredTimeseries.map(item =>
        item.percent_full != null ? parseFloat(item.percent_full) : null
      ),
      yAxisID: 'y',
      fill: false,
      backgroundColor: 'rgb(75,192,192)',
      borderColor: 'rgba(75,192,192,0.5)',
      pointRadius: 0,
      pointHoverRadius: 3,
      tension: 0.4,
      cubicInterpolationMode: 'monotone'
    });
    // last year percentage (hidden by default)
    data.datasets.push({
      label: 'Last Year %',
      data: filteredTimeseries.map(item =>
        item.last_year_percent_full != null ? parseFloat(item.last_year_percent_full) : null
      ),
      yAxisID: 'y',
      fill: false,
      backgroundColor: 'rgb(192,75,75)',
      borderColor: 'rgba(192,75,75,0.5)',
      pointRadius: 0,
      pointHoverRadius: 3,
      tension: 0.4,
      cubicInterpolationMode: 'monotone',
      hidden: true
    });
    // height in meters
    data.datasets.push({
      label: 'Height (m)',
      data: filteredTimeseries.map(item =>
        item.height_m != null ? parseFloat(item.height_m) : null
      ),
      yAxisID: 'y',
      fill: false,
      backgroundColor: 'rgb(54,162,235)',
      borderColor: 'rgba(54,162,235,0.5)',
      pointRadius: 0,
      pointHoverRadius: 3,
      tension: 0.4,
      cubicInterpolationMode: 'monotone',
      hidden: true
    });
    // storage in Ml
    data.datasets.push({
      label: 'Storage (Ml)',
      data: filteredTimeseries.map(item =>
        item.storage_ml != null ? parseFloat(item.storage_ml) : null
      ),
      yAxisID: 'y1',
      fill: false,
      backgroundColor: 'rgb(255,206,86)',
      borderColor: 'rgba(255,206,86,0.5)',
      pointRadius: 0,
      pointHoverRadius: 3,
      tension: 0.4,
      cubicInterpolationMode: 'monotone',
      hidden: true
    });
    // rainfall (mm)
    data.datasets.push({
      label: 'Rainfall (mm)',
      data: rainData,
      yAxisID: 'y2',
      fill: false,
      backgroundColor: 'rgb(54,162,235)',
      borderColor: 'rgba(54,162,235,0.5)',
      pointRadius: 0,
      pointHoverRadius: 3,
      tension: 0.4,
      cubicInterpolationMode: 'monotone'
    });
    // population (yearly)
    data.datasets.push({
      label: 'Population',
      data: popData,
      yAxisID: 'y3',
      fill: false,
      backgroundColor: 'rgb(153,102,255)',
      borderColor: 'rgba(153,102,255,0.5)',
      pointRadius: 0,
      pointHoverRadius: 3,
      tension: 0.4,
      cubicInterpolationMode: 'monotone'
    });
  }

  // Drag state
  const popupRef = useRef(null);
  // initial position: right of panel if provided, else default (10,10)
  const [pos, setPos] = useState(initialPos || { x: 10, y: 10 });
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
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Height (m) / % Full'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Storage (Ml)'
        },
        grid: {
          drawOnChartArea: false
        }
      },
      // rainfall axis
      y2: {
        type: 'linear',
        display: true,
        position: 'right',
        offset: true,
        title: {
          display: true,
          text: 'Rainfall (mm)'
        },
        grid: {
          drawOnChartArea: false
        }
      },
      // population axis
      y3: {
        type: 'linear',
        display: true,
        position: 'left',
        offset: true,
        title: {
          display: true,
          text: 'Population'
        },
        grid: {
          drawOnChartArea: false
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
            const raw = context.raw;
            if (raw == null) return '';
            const num = parseFloat(raw);
            if (isNaN(num)) return '';
            const seriesLabel = context.dataset.label || '';
            let valueStr;
            if (seriesLabel === '% Full' || seriesLabel === 'Last Year %') {
              valueStr = `${num.toFixed(2)}% full`;
            } else if (seriesLabel === 'Height (m)') {
              valueStr = `${num.toFixed(2)} m`;
            } else if (seriesLabel === 'Storage (Ml)') {
              valueStr = `${num.toFixed(0)} Ml`;
            } else {
              valueStr = num.toString();
            }
            return `${seriesLabel}: ${valueStr}`;
          }
        }
      }
    },
    maintainAspectRatio: false
  };

  return (
    <div
      ref={popupRef}
      className={`dam-popup${dragging ? ' dragging' : ''}${expanded ? ' expanded' : ''}`}
      style={expanded ? {} : { left: pos.x, top: pos.y }}
    >
      {/* Drag handle bar */}
      <div className="drag-handle" onMouseDown={handleMouseDown} />
      <div className="dam-popup-header" onMouseDown={handleMouseDown}>
        <h3>{displayName}</h3>
        <div className="dam-popup-controls">
        <button
          onClick={e => { e.stopPropagation(); setExpanded(exp => !exp); }}
          className="dam-popup-expand-button"
          aria-label={expanded ? 'Shrink chart' : 'Expand chart'}
        >{expanded ? '−' : '+'}</button>
          <button
            onClick={onClose}
            className="dam-popup-close-button"
            aria-label="Close popup"
          >×</button>
        </div>
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
            <div className="dam-popup-chart">
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