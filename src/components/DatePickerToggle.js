import React, { useState, useRef, useEffect } from 'react';
import './DatePickerToggle.css';

function DatePickerToggle({ selectedDate, onChange }) {
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

  const handleKeyDown = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(prev => !prev);
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleDateChange = e => {
    // Update the selected date without closing the picker
    onChange(e.target.value);
  };

  return (
    <div className="date-picker-toggle" ref={containerRef}>
      <button
        type="button"
        className="date-picker-toggle-button"
        aria-label="Select date"
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
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
      {open && (
        <div className="date-picker-options" role="dialog">
          <input
            type="date"
            className="date-picker-input"
            value={selectedDate || ''}
            onChange={handleDateChange}
            aria-label="Select date"
          />
        </div>
      )}
    </div>
  );
}

export default DatePickerToggle;