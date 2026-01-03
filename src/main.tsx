import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App' // Assumes App.tsx is in the same folder
import './index.css' // Optional if you have CSS

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
