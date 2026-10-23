import React, { Suspense, useCallback, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { BibleSkeleton, HymnsSkeleton, DevotionSkeleton } from './components/SkeletonScreens';
import Layout from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ToastHost } from './components/Toast';
import { DialogHost } from './components/Dialog';
import { useIsDesktop } from './hooks/useMediaQuery';
import { Splash } from './components/Splash';
import { tr } from './i18n';

/** On a computer the app opens in Studio; on a phone, at Today */
function Start() {
  return useIsDesktop() ? <Studio /> : <Home />;
}

// Lazy loading pages
const Home = React.lazy(() => import('./pages/Home'));
const Studio = React.lazy(() => import('./pages/Studio'));
const Services = React.lazy(() => import('./pages/Services'));
const ServiceDetail = React.lazy(() => import('./pages/ServiceDetail'));
const Hymns = React.lazy(() => import('./pages/Hymns'));
const HymnDetail = React.lazy(() => import('./pages/HymnDetail'));
const Lessons = React.lazy(() => import('./pages/Lessons'));
const LessonDetail = React.lazy(() => import('./pages/LessonDetail'));
const Bible = React.lazy(() => import('./pages/Bible'));
const BibleChapter = React.lazy(() => import('./pages/BibleChapter'));
const Devotion = React.lazy(() => import('./pages/Devotion'));
const Suggestions = React.lazy(() => import('./pages/Suggestions'));
const Display = React.lazy(() => import('./pages/Display'));
const Control = React.lazy(() => import('./pages/Control'));
const Constitution = React.lazy(() => import('./pages/Constitution'));
const Notes = React.lazy(() => import('./pages/Notes'));
const SignIn = React.lazy(() => import('./pages/SignIn'));
const Onboarding = React.lazy(() => import('./pages/Onboarding'));
const Profile = React.lazy(() => import('./pages/Profile'));
const OurChurch = React.lazy(() => import('./pages/OurChurch'));
const PrayerRequests = React.lazy(() => import('./pages/PrayerRequests'));
const Articles = React.lazy(() => import('./pages/Articles'));
const ArticleDetail = React.lazy(() => import('./pages/ArticleDetail'));
const ArticleEditor = React.lazy(() => import('./pages/ArticleEditor'));
const Events = React.lazy(() => import('./pages/Events'));
const Directory = React.lazy(() => import('./pages/Directory'));
const ParishPage = React.lazy(() => import('./pages/ParishPage'));
const ParishAdmin = React.lazy(() => import('./pages/ParishAdmin'));
const Give = React.lazy(() => import('./pages/Give'));
const Live = React.lazy(() => import('./pages/Live'));
const LiveStream = React.lazy(() => import('./pages/LiveStream'));
const Quiz = React.lazy(() => import('./pages/Quiz'));
const Learn = React.lazy(() => import('./pages/Learn'));
const Library = React.lazy(() => import('./pages/Library'));
const ChurchStructure = React.lazy(() => import('./pages/ChurchStructure'));
const Person = React.lazy(() => import('./pages/Person'));
const Stories = React.lazy(() => import('./pages/Stories'));
const StoryDetail = React.lazy(() => import('./pages/StoryDetail'));
const MapGames = React.lazy(() => import('./pages/MapGames'));
const Moderate = React.lazy(() => import('./pages/Moderate'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
           style={{ borderColor: 'var(--color-accent-brand)', borderTopColor: 'transparent' }} />
      <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>{tr('Loading...')}</span>
    </div>
  </div>
);

const SPLASH_KEY = 'cw-splash-seen';
// Once per page load: the app is drawn again when the language changes
let splashShown = false;

/** The splash opens the app once per visit — not on the projector screens, nor for test browsers (unless ?splash) */
function shouldSplash(): boolean {
  if (splashShown) return false;
  try {
    if (new URLSearchParams(window.location.search).has('splash')) return true;
    if (/^\/(display|control)(\/|$)/.test(window.location.pathname) || navigator.webdriver) return false;
    return !sessionStorage.getItem(SPLASH_KEY);
  } catch {
    return false;
  }
}

function App() {
  const [splash, setSplash] = useState(shouldSplash);
  const endSplash = useCallback(() => {
    splashShown = true;
    try { sessionStorage.setItem(SPLASH_KEY, '1'); } catch {}
    setSplash(false);
  }, []);
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Full-screen pages - no app layout */}
          <Route path="/display" element={<Display />} />
          <Route path="/control" element={<Control />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/welcome" element={<Onboarding />} />

          {/* Main layout pages */}
          <Route element={<Layout />}>
            <Route path="/" element={<Start />} />
            <Route path="/today" element={<Home />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/:serviceId" element={<ServiceDetail />} />
            <Route path="/hymns" element={<Suspense fallback={<HymnsSkeleton />}><Hymns /></Suspense>} />
            <Route path="/hymns/:number" element={<Suspense fallback={<HymnsSkeleton />}><HymnDetail /></Suspense>} />
            <Route path="/lessons" element={<Lessons />} />
            <Route path="/lessons/:date" element={<LessonDetail />} />
            <Route path="/bible" element={<Suspense fallback={<BibleSkeleton />}><Bible /></Suspense>} />
            <Route path="/bible/:book/:chapter" element={<Suspense fallback={<BibleSkeleton />}><BibleChapter /></Suspense>} />
            <Route path="/devotion" element={<Suspense fallback={<DevotionSkeleton />}><Devotion /></Suspense>} />
            <Route path="/suggestions" element={<Suggestions />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/constitution" element={<Constitution />} />
            <Route path="/our-church" element={<OurChurch />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/prayer-requests" element={<PrayerRequests />} />
            <Route path="/articles" element={<Articles />} />
            <Route path="/articles/write" element={<ArticleEditor />} />
            <Route path="/articles/:id" element={<ArticleDetail />} />
            <Route path="/events" element={<Events />} />
            <Route path="/directory" element={<Directory />} />
            <Route path="/directory/:id" element={<ParishPage />} />
            <Route path="/parish-admin" element={<ParishAdmin />} />
            <Route path="/give" element={<Give />} />
            <Route path="/live" element={<Live />} />
            <Route path="/live/:id" element={<LiveStream />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/library" element={<Library />} />
            <Route path="/structure" element={<ChurchStructure />} />
            <Route path="/people/:id" element={<Person />} />
            <Route path="/stories" element={<Stories />} />
            <Route path="/stories/:id" element={<StoryDetail />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/maps" element={<MapGames />} />
            <Route path="/moderate" element={<Moderate />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
      {/* Drawn over the app, which loads underneath */}
      {splash && <Splash onDone={endSplash} />}
      <OfflineIndicator />
      <ToastHost />
      <DialogHost />
      {/* Vercel serves its script only on deployments */}
      {!['localhost', '127.0.0.1'].includes(window.location.hostname) && <SpeedInsights />}
    </ErrorBoundary>
  );
}

export default App;
