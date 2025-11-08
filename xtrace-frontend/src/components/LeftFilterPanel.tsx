import { useFilterStore } from '../stores/filterStore';
import './LeftFilterPanel.css';
import { initiateFetch } from '../appController';

/**
 * A reusable component to create a titled section
 */
function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="filter-section">
      <h4>{title}</h4>
      {children}
    </div>
  );
}

/**
 * Helper function to format ISO strings for datetime-local inputs
 */
function formatIsoForInput(isoString: string) {
  return isoString.slice(0, 16);
}

export function LeftFilterPanel() {
  // --- 1. UPDATE TIME RANGE STATE ---
  // We now control 'timeRangeFetched', not 'timeRange'
  const centralAccount = useFilterStore((s) => s.centralAccount);
  const network = useFilterStore((s) => s.network);
  const timeRange = useFilterStore((s) => s.timeRangeFetched); // <-- CHANGED
  
  const setCentralAccount = useFilterStore((s) => s.setCentralAccount);
  const setNetwork = useFilterStore((s) => s.setNetwork);
  // Get the new action
  const setTimeRange = useFilterStore((s) => s.setTimeRangeFetched); // <-- CHANGED
  const resetFilters = useFilterStore((s) => s.resetFilters);
  
  // (Valuation selectors are unchanged)
  const valuations = useFilterStore((s) => s.valuations);
  const treatIouUsdAsOne = useFilterStore((s) => s.treatIouUsdAsOne);
  const setTreatIouUsdAsOne = useFilterStore((s) => s.setTreatIouUsdAsOne);
  const addValuation = useFilterStore((s) => s.addValuation);
  const removeValuation = useFilterStore((s) => s.removeValuation);
  const updateValuation = useFilterStore((s) => s.updateValuation);
  
  // --- 2. UPDATE HANDLERS ---
  // These handlers now all call 'setTimeRangeFetched'
  const handleSetPreset = (days: number) => {
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    setTimeRange({ start: start.toISOString(), end: end.toISOString() });
  };
  const handleSetPresetMinutes = (minutes: number) => {
    const end = new Date();
    const start = new Date(end.getTime() - minutes * 60 * 1000);
    setTimeRange({ start: start.toISOString(), end: end.toISOString() });
  };
  const handleTimeChange = (part: 'start' | 'end', value: string) => {
    setTimeRange({ ...timeRange, [part]: new Date(value).toISOString() });
  };
  
  // The 'Apply' button correctly triggers 'initiateFetch',
  // which will now build its request using 'timeRangeFetched'.
  const handleApply = () => {
    console.log('Apply button clicked. Fetching new data...');
    initiateFetch();
  };


  return (
    <aside className="left-filter-panel">
      <div className="filter-panel-content">
        
        <div className="filter-actions">
          <button className="button-primary" onClick={handleApply}>
            Apply
          </button>
          <button className="button-secondary" onClick={resetFilters}>
            Reset
          </button>
        </div>

        {/* === SECTION 1: SCOPE === */}
        <FilterSection title="Scope">
          <div className="form-group">
            <label htmlFor="central-account">Central Account</label>
            <input
              id="central-account"
              className="input"
              type="text"
              value={centralAccount}
              onChange={(e) => setCentralAccount(e.target.value)}
              placeholder="r..."
            />
          </div>
          <div className="form-group">
            <label htmlFor="network">Network</label>
            <select
              id="network"
              className="select"
              value={network}
              onChange={(e) => setNetwork(e.target.value as 'mainnet' | 'testnet' | 'devnet')}
            >
              <option value="mainnet">Mainnet</option>
              <option value="testnet">Testnet</option>
              <option value="devnet">Devnet</option>
            </select>
          </div>
          <div className="form-group">
            <label>Time Range (Presets)</label>
            <div className="button-group">
              <button onClick={() => handleSetPresetMinutes(5)}>5m</button>
              <button onClick={() => handleSetPresetMinutes(30)}>30m</button>
              <button onClick={() => handleSetPresetMinutes(60)}>1h</button>
            </div>
            <div className="button-group">
              <button onClick={() => handleSetPreset(1)}>24h</button>
              <button onClick={() => handleSetPreset(7)}>7d</button>
              <button onClick={() => handleSetPreset(30)}>30d</button>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="time-start">Start</label>
            <input
              id="time-start"
              className="input"
              type="datetime-local"
              value={formatIsoForInput(timeRange.start)}
              onChange={(e) => handleTimeChange('start', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="time-end">End</label>
            <input
              id="time-end"
              className="input"
              type="datetime-local"
              value={formatIsoForInput(timeRange.end)}
              onChange={(e) => handleTimeChange('end', e.target.value)}
            />
          </div>
        </FilterSection>

        {/* === SECTION 6: VALUATION (Unchanged) === */}
        <FilterSection title="Valuation">
          <div className="form-group-row">
            <input
              type="checkbox"
              id="treat-usd"
              checked={treatIouUsdAsOne}
              onChange={(e) => setTreatIouUsdAsOne(e.target.checked)}
            />
            <label htmlFor="treat-usd">Treat IOU.USD as $1</label>
          </div>

          <div className="valuation-table">
            <div className="valuation-row valuation-header">
              <span>Currency</span>
              <span>Issuer (Opt.)</span>
              <span>Value ($)</span>
              <span></span>
            </div>
            {valuations.map((entry, index) => (
              <div className="valuation-row" key={index}>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. RLUSD"
                  value={entry.currency}
                  onChange={(e) => updateValuation(index, 'currency', e.target.value)}
                />
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. r..."
                  value={entry.issuer || ''}
                  onChange={(e) => updateValuation(index, 'issuer', e.target.value)}
                />
                <input
                  type="number"
                  className="input"
                  min="0"
                  step="0.01"
                  value={entry.value}
                  onChange={(e) => updateValuation(index, 'value', e.target.value)}
                />
                <button
                  className="button-remove"
                  onClick={() => removeValuation(index)}
                  title="Remove rate"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
          <button className="button-secondary" onClick={addValuation}>
            + Add Rate
          </button>
        </FilterSection>

      </div>
    </aside>
  );
}