import { useEffect } from 'react';
import { HeaderBar } from './components/HeaderBar';
import { LeftFilterPanel } from './components/LeftFilterPanel';
import { VisualisationArea } from './components/VisualisationArea';
import { DetailsDrawer } from './components/DetailsDrawer';
import './App.css';
import { initiateFetch, checkBackendHealth } from './appController'; 

function App() {
  
  useEffect(() => {
    // 2. Call both functions on app load
    checkBackendHealth();
    initiateFetch();
  }, []); 

  return (
    <div className="app-shell">
      {/* 1. Header (unchanged) */}
      <HeaderBar />
      
      {/* 2. Main Content (3 columns) */}
      <div className="main-content">
        {/* Column 1: LeftFilterPanel */}
        <LeftFilterPanel />
        
        {/* Column 2: VisualisationArea (will hold our 3 rows) */}
        <VisualisationArea />
        
        {/* Column 3: Right Details Drawer */}
        <DetailsDrawer />
      </div>
    </div>
  );
}

export default App;