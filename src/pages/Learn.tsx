import { Baby, Network, Landmark, ScrollText, PenLine, GraduationCap, Map as MapIcon, Calendar } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { PictureTile, IconRow, TileGroup, type TileItem } from '../components/Tiles';
import { tr } from '../i18n';

/** The four with real pictures lead; the rest follow as rows */
const FEATURED: TileItem[] = [
  { to: '/stories', title: 'Bible stories for children', blurb: 'From the Creation to the early Church', icon: <Baby size={22} />, image: '/tiles/stories.jpg' },
  { to: '/maps', title: 'Bible maps', blurb: 'Walk where Jesus and Paul walked', icon: <MapIcon size={22} />, image: '/tiles/map.jpg' },
  { to: '/our-church', title: 'Our Church', blurb: 'History, beliefs and practice', icon: <Landmark size={22} />, image: '/tiles/church.jpg' },
  { to: '/structure', title: 'Ranks & symbols', blurb: 'Robes, the altar, how the Church is led', icon: <Network size={22} />, image: '/tiles/altar.jpg' },
];
const MORE: TileItem[] = [
  { to: '/lessons', title: 'Bible lessons', blurb: 'The weekly readings of the Church', icon: <Calendar size={22} /> },
  { to: '/quiz', title: 'Quizzes', blurb: 'Bible, hymns, doctrine and the Constitution', icon: <GraduationCap size={22} /> },
  { to: '/library', title: 'Library', blurb: 'Articles and commentaries by shepherds, books and resources', icon: <PenLine size={22} /> },
  { to: '/constitution', title: 'Constitution', blurb: 'How the Church is founded, led and organised', icon: <ScrollText size={22} /> },
];

export default function Learn() {
  usePageTitle('learn', 'Learn');
  return (
    <div className="px-4 py-6 max-w-2xl mx-auto pb-24 space-y-6">
      <header>
        <h1 className="text-2xl font-bold font-[Outfit]" style={{ color: 'var(--color-text-primary)' }}>{tr('Learn')}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{tr('Grow in the Word and in the life of the Church.')}</p>
      </header>
      <ul className="grid grid-cols-2 gap-3">
        {FEATURED.map(item => <li key={item.to}><PictureTile item={item} /></li>)}
      </ul>
      <TileGroup title="Read and study">
        <ul className="space-y-2.5">
          {MORE.map(item => <li key={item.to}><IconRow item={item} /></li>)}
        </ul>
      </TileGroup>
    </div>
  );
}
