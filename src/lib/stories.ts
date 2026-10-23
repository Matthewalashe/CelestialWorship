import { useEffect, useState } from 'react';
import { createJsonResource } from './jsonResource';

/** Children's Bible stories (scripts/build_stories.py → public/data/stories) */

export interface StoryCard { id: string; number: number; title: string; ref: string; part: 'Old Testament' | 'New Testament'; image: string | null }
export interface StoryCollection { id: string; title: string; about: string; credit: string; stories: StoryCard[] }
export interface Story extends Omit<StoryCard, 'image'> {
  image: { src: string; source: string } | null;
  paragraphs: string[];
  questions: string[];
}

const index = createJsonResource<{ collections: StoryCollection[] }, StoryCollection[]>('/data/stories/index.json', 'the stories', d => d.collections);
export const useStoryCollections = () => index.useResource([]);

export function useStory(id: string | undefined) {
  const [story, setStory] = useState<Story | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!id || !/^[a-z0-9-]+$/.test(id)) { setError('Story not found'); return; }
    let cancelled = false;
    setStory(null); setError(null);
    fetch(`/data/stories/${id}.json`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('Story not found'))))
      .then(s => { if (!cancelled) setStory(s); })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [id]);
  return { story, error };
}

const READ_KEY = 'cw-stories-read';
export function readStories(): string[] {
  try { return JSON.parse(localStorage.getItem(READ_KEY) || '[]'); } catch { return []; }
}
export function markStoryRead(id: string) {
  const read = readStories();
  if (!read.includes(id)) { try { localStorage.setItem(READ_KEY, JSON.stringify([...read, id].slice(-500))); } catch {} }
}
