import React from 'react';

/** Skeleton pulse block */
function Pulse({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl ${className}`}
      style={{ backgroundColor: 'var(--color-bg-card)' }}
    />
  );
}

/** Bible page skeleton — book grid */
export function BibleSkeleton() {
  return (
    <div className="px-4 py-6 max-w-4xl mx-auto pb-24">
      <Pulse className="h-8 w-32 mb-2" />
      <Pulse className="h-4 w-56 mb-6" />
      <div className="flex gap-2 mb-4">
        <Pulse className="h-10 w-24" />
        <Pulse className="h-10 w-28" />
      </div>
      <Pulse className="h-12 w-full mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Pulse key={i} className="h-20" />
        ))}
      </div>
    </div>
  );
}

/** Hymnal page skeleton — list of hymn cards */
export function HymnsSkeleton() {
  return (
    <div className="p-4 max-w-5xl mx-auto pb-24">
      <Pulse className="h-9 w-36 mb-6" />
      <Pulse className="h-14 w-full mb-4" />
      <div className="flex gap-2 mb-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Pulse key={i} className="h-8 w-24 shrink-0" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Pulse key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}

/** Devotion page skeleton — service picker + step card */
export function DevotionSkeleton() {
  return (
    <div className="max-w-xl mx-auto px-4 py-8 pb-24">
      <div className="text-center mb-8">
        <Pulse className="h-14 w-14 rounded-full mx-auto mb-4" />
        <Pulse className="h-7 w-48 mx-auto mb-2" />
        <Pulse className="h-4 w-64 mx-auto" />
      </div>
      <Pulse className="h-4 w-32 mb-3" />
      <div className="space-y-2 mb-6">
        <Pulse className="h-16" />
        <Pulse className="h-16" />
      </div>
      <Pulse className="h-14 w-full" />
    </div>
  );
}

/** Generic page skeleton */
export function PageSkeleton() {
  return (
    <div className="px-4 py-6 max-w-4xl mx-auto pb-24">
      <Pulse className="h-8 w-40 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Pulse key={i} className="h-20" />
        ))}
      </div>
    </div>
  );
}
