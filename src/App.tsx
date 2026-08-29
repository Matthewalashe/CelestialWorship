import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { BibleSkeleton, HymnsSkeleton, DevotionSkeleton, PageSkeleton } from './components/SkeletonScreens';
import Layout from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineIndicator } from './components/OfflineIndicator';

// Lazy loading pages
const Home = React.lazy(() => import('./pages/Home'));
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


const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
           style={{ borderColor: 'var(--color-accent-brand)', borderTopColor: 'transparent' }} />
      <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
        Loading...
      </span>
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Standalone pages - no layout */}
          <Route path="/display" element={<Display />} />
          
          {/* Main layout pages */}
          <Route element={<Layout />}>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/:serviceId" element={<ServiceDetail />} />
            <Route path="/hymns" element={<Suspense fallback={<HymnsSkeleton />}><Hymns /></Suspense>} />
            <Route path="/hymns/:number" element={<Suspense fallback={<HymnsSkeleton />}><HymnDetail /></Suspense>} />
            <Route path="/lessons" element={<Lessons />} />
            <Route path="/lessons/:date" element={<LessonDetail />} />
            <Route path="/bible" element={<Suspense fallback={<BibleSkeleton />}><Bible /></Suspense>} />
            <Route path="/bible/:book/:chapter" element={<Suspense fallback={<BibleSkeleton />}><BibleChapter /></Suspense>} />
            <Route path="/devotion" element={<Suspense fallback={<DevotionSkeleton />}><Devotion /></Suspense>} />

            {/* Routes — auth guard removed for now, re-enable when domain is ready */}
            <Route path="/suggestions" element={<Suggestions />} />
            <Route path="/control" element={<Control />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/constitution" element={<Constitution />} />
          </Route>
        </Routes>
      </Suspense>
      <OfflineIndicator />
      <SpeedInsights />
    </ErrorBoundary>
  );
}

export default App;
