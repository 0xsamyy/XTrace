import { NetworkView } from './NetworkView';
import { TopFilterPanel } from './TopFilterPanel';
import { BottomPanel } from './BottomPanel';
import './VisualisationArea.css';

export function VisualisationArea() {
  return (
    <div className="visualisation-area">
      {/* Row 1: Top quick filters */}
      <TopFilterPanel />

      {/* Row 2: Graph area grows */}
      <div className="graph-area-wrapper">
        <NetworkView />
      </div>

      {/* Row 3: Timeline/brush */}
      <BottomPanel />
    </div>
  );
}