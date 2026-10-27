import { Link } from 'react-router-dom';
import { ScrollText, Handshake, Scale, Target, ExternalLink, GraduationCap, Crown } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { TIMELINE, COMMON_GROUND, POINTS_OF_DIFFERENCE, APP_POSITION, VISION, MISSION, SOURCES } from '../data/churchHistory';
import { tr } from '../i18n';
import { FOUNDER, PASTOR, PAST_PASTORS, GOVERNING_BODIES, type Leader } from '../data/churchLeaders';

const card = { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' };

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-bold font-[Outfit] mb-3" style={{ color: 'var(--color-text-primary)' }}>
      <span style={{ color: 'var(--color-accent-gold)' }}>{icon}</span>{children}
    </h2>
  );
}

/** A leader with a photograph (credited) or their initials */
function LeaderCard({ leader, large = false }: { leader: Leader; large?: boolean }) {
  const initials = leader.name.replace(/^Rev\.\s*/, '').split(/\s+/).map(w => w[0]).filter(c => /[A-Z]/.test(c)).slice(0, 2).join('');
  return (
    <figure className="rounded-2xl border overflow-hidden" style={card}>
      {leader.photo ? (
        <img src={leader.photo.src} alt={leader.photo.alt} loading="lazy" decoding="async"
             className={`w-full object-cover ${large ? 'aspect-[4/5]' : 'aspect-square'}`} style={{ backgroundColor: 'var(--color-bg-secondary)' }} />
      ) : (
        <div className="w-full aspect-[3/1] flex items-center justify-center text-2xl font-bold font-[Outfit]"
             style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-gold) 14%, transparent)', color: 'var(--color-accent-gold)' }} aria-hidden>{initials}</div>
      )}
      <figcaption className="p-4 space-y-1">
        <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-accent-gold)' }}>{tr(leader.role)}</p>
        <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr(leader.name)}</p>
        <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>{tr(leader.years)}</p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{tr(leader.detail)}</p>
        {leader.photo && (
          <p className="text-[10px] pt-1" style={{ color: 'var(--color-text-muted)' }}>
            {leader.photo.caption ? `${tr(leader.photo.caption)} · ` : ''}{tr('Photo')}: <a href={leader.photo.source} target="_blank" rel="noopener noreferrer" className="underline">{tr(leader.photo.credit)}</a>, {leader.photo.license}
          </p>
        )}
      </figcaption>
    </figure>
  );
}

export default function OurChurch() {
  usePageTitle('our_church', 'Our Church: History & Common Ground');

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto pb-24 space-y-10">
      <header>
        <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-accent-gold)' }}>{tr('Ijo Mimo ti Kristi lati Orun wa')}</p>
        <h1 className="text-3xl font-bold font-[Outfit] mt-1" style={{ color: 'var(--color-text-primary)' }}>{tr('Our Church')}</h1>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{tr('The story of the Celestial Church of Christ, what it stands for, and what every Celestian holds in common.')}</p>
      </header>

      <section>
        <SectionTitle icon={<Target size={20} />}>{tr('Vision & mission')}</SectionTitle>
        <div className="rounded-2xl border p-5" style={card}>
          <p className="text-lg font-semibold italic" style={{ color: 'var(--color-text-primary)' }}>“{tr(VISION)}”</p>
          <ul className="mt-4 grid sm:grid-cols-2 gap-2">
            {MISSION.map(m => (
              <li key={m} className="text-sm flex gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                <span style={{ color: 'var(--color-accent-gold)' }}>✦</span>{tr(m)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle icon={<Crown size={20} />}>{tr('Leadership')}</SectionTitle>
        <div className="grid sm:grid-cols-2 gap-3">
          <LeaderCard leader={FOUNDER} large />
          <LeaderCard leader={PASTOR} large />
        </div>
        <h3 className="text-xs uppercase tracking-wider font-bold pt-2" style={{ color: 'var(--color-text-muted)' }}>{tr('Past Pastors')}</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {PAST_PASTORS.map(l => <LeaderCard key={tr(l.name)} leader={l} />)}
        </div>
        <div className="grid sm:grid-cols-2 gap-3 pt-2">
          {GOVERNING_BODIES.map(b => (
            <div key={tr(b.name)} className="rounded-2xl border p-4" style={card}>
              <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr(b.name)}</p>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{tr(b.detail)}</p>
              <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-muted)' }}>{tr(b.source)}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle icon={<ScrollText size={20} />}>{tr('History')}</SectionTitle>
        <ol className="relative border-l-2 ml-2 space-y-5" style={{ borderColor: 'var(--color-border)' }}>
          {TIMELINE.map(e => (
            <li key={e.date + e.title} className="pl-5 relative">
              <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--color-accent-gold)' }} />
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-accent-brand)' }}>{e.date}</p>
              <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr(e.title)}</p>
              <p className="text-sm mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{tr(e.detail)}</p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{tr(e.source)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <SectionTitle icon={<Handshake size={20} />}>{tr('What every Celestian shares')}</SectionTitle>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{tr('Since 2001 the Church has had more than one claimant to the office of Pastor. Beneath that, the faith, the worship and the way of life are the same in every parish.')}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {COMMON_GROUND.map(c => (
            <div key={tr(c.title)} className="rounded-2xl border p-4" style={card}>
              <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr(c.title)}</p>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{tr(c.detail)}</p>
              <p className="text-[11px] mt-2" style={{ color: 'var(--color-text-muted)' }}>{tr(c.source)}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle icon={<Scale size={20} />}>{tr('Where views differ')}</SectionTitle>
        <div className="space-y-3">
          {POINTS_OF_DIFFERENCE.map(p => (
            <div key={tr(p.title)} className="rounded-2xl border p-4" style={card}>
              <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{tr(p.title)}</p>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{tr(p.detail)}</p>
            </div>
          ))}
        </div>
        <p className="text-sm mt-4 p-4 rounded-2xl leading-relaxed"
           style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-gold) 10%, transparent)', color: 'var(--color-text-primary)' }}>
          {tr(APP_POSITION)}
        </p>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link to="/constitution" className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2">
          <ScrollText size={16} />{' '}{tr('Read the Constitution')}</Link>
        <Link to="/quiz?topic=doctrine" className="px-5 py-2.5 rounded-xl text-sm font-semibold border inline-flex items-center gap-2"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
          <GraduationCap size={16} />{' '}{tr('Test your knowledge')}</Link>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-wider font-bold mb-2" style={{ color: 'var(--color-text-muted)' }}>{tr('Sources')}</h3>
        <ul className="space-y-1">
          {SOURCES.map(s => (
            <li key={tr(s.label)} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline py-1.5">
                  {tr(s.label)} <ExternalLink size={11} />
                </a>
              ) : tr(s.label)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
