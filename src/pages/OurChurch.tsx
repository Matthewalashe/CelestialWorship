import { Link } from 'react-router-dom';
import { ScrollText, Handshake, Scale, Target, ExternalLink, GraduationCap } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { TIMELINE, COMMON_GROUND, POINTS_OF_DIFFERENCE, APP_POSITION, VISION, MISSION, SOURCES } from '../data/churchHistory';

const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-bold font-[Outfit] mb-3" style={{ color: 'var(--color-text-primary)' }}>
      <span style={{ color: 'var(--color-accent-gold)' }}>{icon}</span>{children}
    </h2>
  );
}

export default function OurChurch() {
  usePageTitle('our_church', 'Our Church — History & Common Ground');

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto pb-24 space-y-10">
      <header>
        <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-accent-gold)' }}>Ijo Mimo ti Kristi lati Orun wa</p>
        <h1 className="text-3xl font-bold font-[Outfit] mt-1" style={{ color: 'var(--color-text-primary)' }}>Our Church</h1>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          The story of the Celestial Church of Christ, what it stands for, and what every Celestian holds in common.
        </p>
      </header>

      <section>
        <SectionTitle icon={<Target size={20} />}>Vision & mission</SectionTitle>
        <div className="rounded-2xl border p-5" style={card}>
          <p className="text-lg font-semibold italic" style={{ color: 'var(--color-text-primary)' }}>“{VISION}”</p>
          <ul className="mt-4 grid sm:grid-cols-2 gap-2">
            {MISSION.map(m => (
              <li key={m} className="text-sm flex gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                <span style={{ color: 'var(--color-accent-gold)' }}>✦</span>{m}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <SectionTitle icon={<ScrollText size={20} />}>History</SectionTitle>
        <ol className="relative border-l-2 ml-2 space-y-5" style={{ borderColor: 'var(--color-border)' }}>
          {TIMELINE.map(e => (
            <li key={e.date + e.title} className="pl-5 relative">
              <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--color-accent-gold)' }} />
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-accent-brand)' }}>{e.date}</p>
              <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{e.title}</p>
              <p className="text-sm mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{e.detail}</p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{e.source}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <SectionTitle icon={<Handshake size={20} />}>What every Celestian shares</SectionTitle>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          Since 2001 the Church has had more than one claimant to the office of Pastor. Beneath that, the faith, the worship and
          the way of life are the same in every parish.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {COMMON_GROUND.map(c => (
            <div key={c.title} className="rounded-2xl border p-4" style={card}>
              <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{c.title}</p>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{c.detail}</p>
              <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-muted)' }}>{c.source}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle icon={<Scale size={20} />}>Where views differ</SectionTitle>
        <div className="space-y-3">
          {POINTS_OF_DIFFERENCE.map(p => (
            <div key={p.title} className="rounded-2xl border p-4" style={card}>
              <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{p.title}</p>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{p.detail}</p>
            </div>
          ))}
        </div>
        <p className="text-sm mt-4 p-4 rounded-2xl leading-relaxed"
           style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-gold) 10%, transparent)', color: 'var(--color-text-primary)' }}>
          {APP_POSITION}
        </p>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link to="/constitution" className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2">
          <ScrollText size={16} /> Read the Constitution
        </Link>
        <Link to="/quiz?topic=doctrine" className="px-5 py-2.5 rounded-xl text-sm font-semibold border inline-flex items-center gap-2"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
          <GraduationCap size={16} /> Test your knowledge
        </Link>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wider font-bold mb-2" style={{ color: 'var(--color-text-muted)' }}>Sources</h3>
        <ul className="space-y-1">
          {SOURCES.map(s => (
            <li key={s.label} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline py-1.5">
                  {s.label} <ExternalLink size={11} />
                </a>
              ) : s.label}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
