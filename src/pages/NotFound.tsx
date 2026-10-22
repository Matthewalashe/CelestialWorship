import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

export default function NotFound() {
  usePageTitle('not_found', 'Page not found');
  return (
    <div className="px-4 py-16 max-w-md mx-auto text-center">
      <p className="text-5xl font-black font-[Outfit]" style={{ color: 'var(--color-accent-gold)' }}>404</p>
      <p className="mt-3" style={{ color: 'var(--color-text-secondary)' }}>We couldn’t find that page.</p>
      <div className="flex justify-center gap-2 mt-6">
        <Link to="/" className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold">Home</Link>
        <Link to="/hymns" className="px-5 py-2.5 rounded-xl text-sm font-semibold border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>Hymnal</Link>
      </div>
    </div>
  );
}
