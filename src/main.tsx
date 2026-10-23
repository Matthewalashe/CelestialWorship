import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './hooks/useTheme'
import { AuthProvider } from './hooks/useAuth'
import { ReaderProvider } from './hooks/useReader'
import ScrollToTop from './components/ScrollToTop'
import App from './App'
import './index.css'
import { reportError } from './hooks/useAnalytics'

window.addEventListener('error', e => reportError(e.error ?? e.message, 'window'))
window.addEventListener('unhandledrejection', e => reportError(e.reason, 'promise'))

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ReaderProvider>
            <ScrollToTop />
            <App />
          </ReaderProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

