import { useFilterStore } from '../stores/filterStore';
import { computeViewData } from '../transforms/viewTransforms';
import type { TransactionType, Direction } from '../stores/filterStore';
import { useEffect } from 'react';
import './TopFilterPanel.css';

export function TopFilterPanel() {
  // --- (Get state and actions) ---
  const types = useFilterStore((s) => s.types);
  const direction = useFilterStore((s) => s.direction);
  const showDust = useFilterStore((s) => s.showDust);
  
  const setTypes = useFilterStore((s) => s.setTypes);
  const setDirection = useFilterStore((s) => s.setDirection);
  const setShowDust = useFilterStore((s) => s.setShowDust);

  // --- (Auto-Apply Logic) ---
  useEffect(() => {
    console.log('Top filters changed, re-computing view...');
    computeViewData();
  }, [types, direction, showDust]);

  // --- (Handlers) ---
  const handleTypeToggle = (type: TransactionType) => {
    const newTypes = types.includes(type)
      ? types.filter((t) => t !== type)
      : [...types, type];
    setTypes(newTypes);
  };
  const handleDirectionChange = (dir: Direction) => {
    setDirection(dir);
  };

  return (
    <aside className="top-filter-panel"> 
      <div className="filter-groups-wrapper">
        {/* Type Filter */}
        <div className="chip-group">
          <span className="chip-label">Type:</span>
          <button
            className={`chip ${types.includes('PAYMENT_XRP') ? 'active' : ''}`}
            onClick={() => handleTypeToggle('PAYMENT_XRP')}
          >
            PAYMENT_XRP
          </button>
          <button
            className={`chip ${types.includes('PAYMENT_IOU') ? 'active' : ''}`}
            onClick={() => handleTypeToggle('PAYMENT_IOU')}
          >
            PAYMENT_IOU
          </button>
        </div>

        {/* Direction Filter */}
        <div className="chip-group">
          <span className="chip-label">Direction:</span>
          <div className="toggle-group">
            <button
              className={`toggle-button ${direction === 'inbound' ? 'active' : ''}`}
              onClick={() => handleDirectionChange('inbound')}
            >
              Inbound
            </button>
            <button
              className={`toggle-button ${direction === 'outbound' ? 'active' : ''}`}
              onClick={() => handleDirectionChange('outbound')}
            >
              Outbound
            </button>
            <button
              className={`toggle-button ${direction === 'both' ? 'active' : ''}`}
              onClick={() => handleDirectionChange('both')}
            >
              Both
            </button>
          </div>
        </div>
        
        {/* --- DUST FILTER (Fixed & Simplified) --- */}
        <div className="chip-group">
          <span className="chip-label">View:</span>

          <div
            className={`toggle-chip ${showDust ? 'active' : ''}`}
            onClick={() => setShowDust(!showDust)}   // ✅ single clean click handler
            role="checkbox"
            aria-checked={showDust}
          >
            <input
              type="checkbox"
              checked={showDust}
              readOnly               // ✅ prevents React warnings
            />
            <span>Show Dust (&lt; $1)</span>
          </div>
        </div>
        
      </div>
    </aside>
  );
}