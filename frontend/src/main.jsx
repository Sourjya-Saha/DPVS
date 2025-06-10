import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client' // Correct React 18 API
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)