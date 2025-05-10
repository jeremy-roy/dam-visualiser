
import React, { useState, useRef, useEffect } from 'react';
import './BasemapToggle.css';

const STYLE_OPTIONS = [
  { id: 'mapbox://styles/mapbox/light-v10', label: 'Light' },
  { id: 'mapbox://styles/mapbox/dark-v10', label: 'Dark' },
  { id: 'mapbox://styles/mapbox/satellite-v9', label: 'Satellite' }
];

function BasemapToggle({ currentStyle, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleToggleClick = () => {
    setOpen(prev => !prev);
  };

  const handleOptionClick = (id) => {
    onChange(id);
    // Keep the options panel open after selecting an option
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(prev => !prev);
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="basemap-toggle" ref={containerRef}>
      <button
        type="button"
        className="basemap-toggle-button"
        aria-label="Toggle basemap styles"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={handleToggleClick}
        onKeyDown={handleKeyDown}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 12 12 17 22 12" />
          <polyline points="2 17 12 22 22 17" />
        </svg>
      </button>
      {open && (
        <div className="basemap-options" role="menu">
          {STYLE_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              className={`basemap-option-button${currentStyle === id ? ' selected' : ''}`}
              onClick={() => handleOptionClick(id)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


export default BasemapToggle;