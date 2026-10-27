import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './hooks/useTheme'
import { AuthProvider } from './hooks/useAuth'
import { ReaderProvider } from './hooks/useReader'
import { MusicProvider } from './hooks/useMusic'
import ScrollToTop from './components/ScrollToTop'
import App from './App'
import './index.css'
import { reportError, startSession } from './hooks/useAnalytics'
import { useLanguageVersion } from './i18n'
import { settleHome } from './lib/moveHome'
// Catches the browser's one-time install offer before any screen asks for it
import './hooks/usePWAInstall'

window.addEventListener('error', e => reportError(e.error ?? e.message, 'window'))
window.addEventListener('unhandledrejection', e => reportError(e.reason, 'promise'))
startSession()

/** Draws the app again in a new language; providers (and the music) carry on */
function Localised() {
  return <App key={useLanguageVersion()} />
}

// On the old address the page moves to celestialworship.online first, bringing the reader's things with it
settleHome().then(leaving => { if (!leaving) render() })

function render() {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <ReaderProvider>
              <MusicProvider>
                <ScrollToTop />
                <Localised />
              </MusicProvider>
            </ReaderProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </React.StrictMode>,
  )
}
