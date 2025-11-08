import { useDataStore } from '../stores/dataStore';
import { useFilterStore } from '../stores/filterStore';
import { initiateFetch } from '../appController';
import './DetailsDrawer.css';

export function DetailsDrawer() {
  const selectionId = useDataStore((state) => state.selection);
  const nodes = useDataStore((state) => state.computedNetworkData.nodes);
  const setSelection = useDataStore((state) => state.setSelection);
  const setCentralAccount = useFilterStore((state) => state.setCentralAccount);

  // This logic is all correct
  const selectedNode = nodes.find(n => n.id === selectionId);

  const handleRecenter = () => {
    if (!selectedNode) return;
    
    console.log('Re-centering from DetailsDrawer on:', selectedNode.id);
    setSelection(null); 
    setCentralAccount(selectedNode.id);
    initiateFetch();
  };

  const handleClear = () => {
    setSelection(null);
  };

  // --- 🟢 NEW: Conditional labels ---
  const isInflowLabel = selectedNode?.isCentral
    ? 'Total Inflow (from others)'
    : 'Inflow (from Central)';
  
  const isOutflowLabel = selectedNode?.isCentral
    ? 'Total Outflow (to others)'
    : 'Outflow (to Central)';
  // --- End of new code ---

  return (
    <aside className="details-drawer">
      {selectedNode ? (
        <div className="drawer-content">
          <h4>Node Details</h4>
          <button className="close-button" onClick={handleClear}>&times;</button>
          
          <div className="drawer-section">
            <label>Address</label>
            <p className="address-p">{selectedNode.id}</p>
          </div>

          <div className="drawer-section">
            <label>Total Transactions</label>
            <p>{selectedNode.txCount}</p>
          </div>
          
          <div className="drawer-section">
            {/* 🟢 FIX: Use the conditional label */}
            <label>{isInflowLabel}</label>
            <p>${selectedNode.inboundValue.toFixed(2)}</p>
          </div>
          
          <div className="drawer-section">
            {/* 🟢 FIX: Use the conditional label */}
            <label>{isOutflowLabel}</label>
            <p>${selectedNode.outboundValue.toFixed(2)}</p>
          </div>
          
          {!selectedNode.isCentral && (
            <button 
              className="button-primary" 
              onClick={handleRecenter}
            >
              Re-center on this Account
            </button>
          )}
        </div>
      ) : (
        <div className="placeholder">
          <h3>DetailsDrawer</h3>
          <p>Click a node in the graph to see its details.</p>
        </div>
      )}
    </aside>
  );
}