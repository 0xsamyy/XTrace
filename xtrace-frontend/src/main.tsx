import React from 'react'
import ReactDOM from 'react-dom/client'
// This imports your app.tsx file
import App from './app.tsx' 

// We don't need the default index.css, because 
// App.tsx imports App.css directly.

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)