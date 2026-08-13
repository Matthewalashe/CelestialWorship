import React, { useState } from 'react';

// The Constitution of the Celestial Church of Christ
// This is a structured reference document for members
const CONSTITUTION_SECTIONS = [
  {
    id: 'preamble',
    title: 'Preamble',
    icon: '📜',
    content: `The Celestial Church of Christ, founded on 29th September 1947 by the late Rev. Pastor Founder Samuel Biléhou Joseph Oschoffa, is a divinely revealed church established through the guidance of the Holy Spirit.

The Church operates under the authority of God Almighty, guided by the Holy Bible and the tenets revealed to the founder. This Constitution sets forth the fundamental principles, governance structures, and operational guidelines for the worldwide body of the Celestial Church of Christ.

All parishes, dioceses, and archdioceses worldwide shall be governed by this Constitution and such amendments as may be duly made from time to time by the competent authority of the Church.`
  },
  {
    id: 'article1',
    title: 'Article 1: Name & Identity',
    icon: '✝️',
    content: `1.1 The name of the Church is "Celestial Church of Christ" (Ijo Mimo ti Kristi lati Orun wa).

1.2 The Church was founded on the 29th day of September, 1947, in Porto-Novo, Republic of Dahomey (now Republic of Benin).

1.3 The Founder of the Church is the late Most Reverend Pastor Founder Prophet Samuel Biléhou Joseph Oschoffa (1909–1985).

1.4 The International Headquarters of the Church is at Imeko, Ogun State, Nigeria.

1.5 The emblem of the Church consists of a cross on a globe, with the letters "C.C.C." and the motto "It is God that is doing it".

1.6 The official colours of the Church are white and blue.

1.7 The official language of worship shall be in the language of the congregation, with Yoruba and French as the original languages of the Church.`
  },
  {
    id: 'article2',
    title: 'Article 2: Beliefs & Doctrines',
    icon: '🕊️',
    content: `2.1 The Church believes in One God — Father, Son, and Holy Spirit.

2.2 The Church believes in the Holy Bible as the inspired word of God and the final authority in all matters of faith and practice.

2.3 The Church believes in the virgin birth, crucifixion, death, resurrection, and ascension of our Lord Jesus Christ.

2.4 The Church believes in the Holy Spirit as the Comforter promised by Jesus Christ.

2.5 The Church believes in the efficacy of prayer, with the use of consecrated water, candles, incense, and other spiritual elements as revealed by God.

2.6 The Church observes the following sacraments:
  (a) Baptism by immersion
  (b) Holy Communion
  (c) Washing of Feet

2.7 The Church holds that white garments (sutana) shall be worn during worship as a symbol of purity and equality before God.

2.8 Members shall remove their shoes in the place of worship, in accordance with biblical injunction (Exodus 3:5).

2.9 The Church prohibits the worship of idols, the use of fetish objects, and the consultation of witch doctors or traditional healers.

2.10 The Church recognises the gifts of the Holy Spirit including prophecy, vision, healing, and speaking in tongues.`
  },
  {
    id: 'article3',
    title: 'Article 3: Membership',
    icon: '👥',
    content: `3.1 Membership is open to all persons who accept Jesus Christ as their Lord and Saviour and agree to abide by the Constitution and tenets of the Church.

3.2 Categories of membership:
  (a) Full Members — baptised members in good standing
  (b) Seekers — those undergoing preparation for baptism
  (c) Associate Members — visitors who regularly attend services

3.3 A member in good standing is one who:
  (a) Attends services regularly
  (b) Pays tithes and offerings
  (c) Lives in accordance with the teachings of the Church
  (d) Is not under any disciplinary sanction

3.4 A member may be disciplined or expelled for:
  (a) Persistent violation of Church tenets
  (b) Conduct unbecoming of a Christian
  (c) Spreading false doctrines
  (d) Consulting witch doctors or engaging in occult practices
  (e) Refusal to obey constituted authority within the Church

3.5 Any disciplined member may appeal to the next higher authority within the Church hierarchy.`
  },
  {
    id: 'article4',
    title: 'Article 4: Church Hierarchy',
    icon: '⭐',
    content: `4.1 The hierarchy of the Church, in descending order, is:
  (a) Pastor Founder (The late Rev. S.B.J. Oschoffa — forever recognised)
  (b) Pastor / Head of the Church Worldwide
  (c) Supreme Evangelist
  (d) Most Superior Evangelist
  (e) Superior Evangelist
  (f) Evangelist
  (g) Most Superior Senior Shepherd
  (h) Superior Senior Shepherd
  (i) Senior Shepherd
  (j) Shepherd
  (k) Leader
  (l) Wolider (Worshipper)

4.2 Special spiritual offices include:
  (a) Prophet / Prophetess
  (b) Visioner / Visioneress

4.3 The Head of the Church Worldwide is the supreme spiritual and administrative leader of the Church.

4.4 Women may serve in all spiritual capacities including Prophetess, Visioneress, Senior Mother, and Mother in Israel, but the office of Pastor, Evangelist, and Shepherd is reserved for men.

4.5 Promotion within the hierarchy is based on:
  (a) Length of service
  (b) Spiritual maturity and conduct
  (c) Recommendation by the local parish and diocesan authorities
  (d) Approval by the appropriate higher authority`
  },
  {
    id: 'article5',
    title: 'Article 5: Worship & Services',
    icon: '🕯️',
    content: `5.1 All services shall be conducted in white garments (sutana).

5.2 The regular services of the Church are:
  (a) Morning Service — Daily at 6:00 AM
  (b) Seekers Service — Wednesday at 9:00 AM
  (c) Mercy Day Service — Wednesday at 6:00 PM
  (d) Power Day Service — Friday at 6:00 PM
  (e) Lord's Day Service — Sunday at 10:00 AM
  (f) Evening Service — Sunday at 6:00 PM

5.3 Special services include:
  (a) New Moon Service — First Thursday of the month
  (b) End of Year Service — December 31st
  (c) Baby Christening, Baptism, Holy Matrimony
  (d) Burial and Remembrance services

5.4 The Order of Service as established by the Pastor Founder shall be followed in all parishes.

5.5 The use of drums, musical instruments, or amplified music during services is governed by local diocesan regulations.

5.6 Prophetic utterances during service must be subject to the authority of the officiating minister.

5.7 Tithes and offerings shall be collected during services and accounted for transparently.`
  },
  {
    id: 'article6',
    title: 'Article 6: Administration',
    icon: '🏛️',
    content: `6.1 The administrative structure of the Church consists of:
  (a) The International Headquarters (Imeko, Nigeria)
  (b) National / Territorial Headquarters
  (c) Archdioceses
  (d) Dioceses
  (e) Parishes

6.2 Each parish shall have:
  (a) A Shepherd or Leader in charge
  (b) A Parish Committee comprising elected and appointed members
  (c) A financial secretary and treasurer
  (d) A welfare committee

6.3 The finances of each parish shall be audited annually and reports submitted to the diocesan authority.

6.4 Church properties are held in trust for the entire body and may not be alienated without proper authority.

6.5 All parishes must register with and submit to the authority of their respective diocesan and national headquarters.`
  },
  {
    id: 'article7',
    title: 'Article 7: Discipline & Conduct',
    icon: '⚖️',
    content: `7.1 Members are expected to live holy and exemplary lives.

7.2 The following are prohibited:
  (a) Polygamy for those who joined the Church as singles (those who were polygamists before joining are accepted but may not take additional wives)
  (b) Smoking, excessive drinking, and drug abuse
  (c) Fornication and adultery
  (d) Theft, fraud, and dishonesty
  (e) Fighting and violence
  (f) Consultation of witch doctors or traditional healers
  (g) Wearing of shoes in the sanctuary

7.3 Women during their monthly period and for a period after childbirth shall observe the prescribed period of separation before returning to the sanctuary.

7.4 Disciplinary measures include:
  (a) Private admonition
  (b) Public admonition
  (c) Suspension from duties
  (d) Suspension from membership
  (e) Expulsion

7.5 All disciplinary matters shall follow due process, with the right of appeal guaranteed.`
  },
];

export default function Constitution() {
  const [expandedSection, setExpandedSection] = useState<string | null>('preamble');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSections = CONSTITUTION_SECTIONS.filter(section => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      section.title.toLowerCase().includes(q) ||
      section.content.toLowerCase().includes(q)
    );
  });

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto pb-24 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-[Outfit] font-bold" style={{ color: 'var(--color-text-primary)' }}>
          📜 Constitution
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Constitution of the Celestial Church of Christ
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search the Constitution..."
          className="w-full rounded-xl px-4 py-3 text-sm transition-colors"
          style={{
            backgroundColor: 'var(--color-bg-card)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
          }}
        />
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {filteredSections.map((section) => {
          const isExpanded = expandedSection === section.id;
          
          return (
            <div key={section.id} className="card overflow-hidden">
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                className="w-full flex items-center gap-3 p-4 text-left transition-colors"
                style={{ color: 'var(--color-text-primary)' }}
              >
                <span className="text-xl">{section.icon}</span>
                <span className="flex-1 font-semibold text-sm font-[Outfit]">
                  {section.title}
                </span>
                <span className="text-lg transition-transform duration-200"
                      style={{ 
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        color: 'var(--color-accent-teal)',
                      }}>
                  ▾
                </span>
              </button>
              
              {isExpanded && (
                <div className="px-4 pb-4 animate-fade-in"
                     style={{ borderTop: '1px solid var(--color-border)' }}>
                  <div className="pt-4 text-sm leading-relaxed whitespace-pre-line"
                       style={{ color: 'var(--color-text-secondary)' }}>
                    {searchTerm.trim() ? highlightText(section.content, searchTerm) : section.content}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredSections.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
          No sections found matching "{searchTerm}"
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-8 p-4 rounded-xl text-xs text-center"
           style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
        This is a reference summary for members. For the complete official text, please consult your parish or diocesan authority.
      </div>
    </div>
  );
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent-gold) 30%, transparent)', color: 'inherit', borderRadius: '2px', padding: '0 2px' }}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
