import { Link } from 'react-router-dom';
import { Baby, Network, Landmark, ScrollText, PenLine, GraduationCap, Map as MapIcon, Calendar, ChevronRight } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { tr } from '../i18n';

const SECTIONS: { to: string; title: string; text: string; icon: React.ReactNode }[] = [
  { to: '/stories', title: 'Bible stories for children', text: 'From the Creation to the early Church, told for young readers', icon: <Baby size={22} /> },
  { to: '/lessons', title: 'Bible lessons', text: 'The weekly readings of the Church', icon: <Calendar size={22} /> },
  { to: '/library', title: 'Library', text: 'Articles and commentaries by shepherds, books and resources', icon: <PenLine size={22} /> },
  { to: '/our-church', title: 'Our Church', text: 'History, beliefs and practice of the Celestial Church of Christ', icon: <Landmark size={22} /> },
  { to: '/structure', title: 'Ranks, structure & symbols', text: 'The ranks and robes, how the Church is governed, the altar, candles and more', icon: <Network size={22} /> },
  { to: '/constitution', title: 'Constitution', text: 'How the Church is founded, led and organised', icon: <ScrollText size={22} /> },
  { to: '/quiz', title: 'Quizzes', text: 'Bible, hymns, doctrine and the Constitution', icon: <GraduationCap size={22} /> },
  { to: '/maps', title: 'Bible maps', text: 'Walk where Jesus and Paul walked', icon: <MapIcon size={22} /> },
];

export default function Learn() {
  usePageTitle('learn', 'Learn');
  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-24">
      <h1 className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{tr('Learn')}</h1>
      <p className="text-sm mt-1 mb-5" style={{ color: 'var(--color-text-secondary)' }}>{tr('Grow in the Word and in the life of the Church.')}</p>
      <ul className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-bg-card)' }}>
        {SECTIONS.map((s, i) => (
          <li key={s.to} style={i ? { borderTop: '1px solid var(--color-border)' } : undefined}>
            <Link to={s.to} className="flex items-center gap-4 px-4 py-4">
              <span style={{ color: 'var(--color-accent-brand)' }}>{s.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr(s.title)}</span>
                <span className="block text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{tr(s.text)}</span>
              </span>
              <ChevronRight size={18} style={{ color: 'var(--color-text-muted)' }} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
