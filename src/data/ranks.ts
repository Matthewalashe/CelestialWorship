/**
 * Ranks, structure and symbols of the Celestial Church of Christ.
 *
 * Ranks and garments: “Spiritual Ranks”, Celestial Church of Christ Worldwide
 * (http://www.celestialchurchofchrist-worldwide.org/spiritual_ranks.htm). The Constitution (1980), clause 185,
 * names the Church’s own publication “Order of Seniority and Promotion and Dressing Rank by Rank” as the
 * authority, and orders can differ slightly between publications, so the app says so.
 * Structure and practice: the 1980 Constitution (clauses cited).
 */

export interface Rank {
  /** 1 = most senior in the list */
  order: number;
  name: string;
  /** Non-prophet (leader) line or prophet line; `both` where the lines meet */
  line: 'leader' | 'prophet' | 'both';
  garment: string;
  loins?: string;
  crosses?: string;
  strands?: string;
  note?: string;
  /** Colour used to draw the robe in the chart (from the garment description) */
  robe?: string;
}

export const MEN_RANKS: Rank[] = [
  { order: 1, name: 'Pastor (Reverend)', line: 'both', garment: 'Pastoral garment', robe: '#FFFFFF', note: 'Head of the Church worldwide (Constitution, cl. 156)' },
  { order: 2, name: 'Supreme Evangelist', line: 'both', garment: 'White or deep blue cassock, long deep blue robe, purple cross-bar, lace-lined cape', loins: 'White or deep blue with purple altar-cross design', crosses: '3 in front; 3 on each end', strands: 'Purple', robe: '#1E3A8A' },
  { order: 3, name: 'Most Superior Evangelist', line: 'both', garment: 'White or light blue cassock, long blue robe, deep blue cross-bar, lace on cape and from neck to hem', loins: 'Blue with white altar-cross design', crosses: '3 in front; 3 on each end', strands: 'White', robe: '#3B82F6' },
  { order: 4, name: 'Superior Evangelist', line: 'both', garment: 'White or purple cassock, long purple robe, yellow-and-white stranded cross-bar', loins: 'Purple and white altar design', crosses: '3 in front; 3 on each end', strands: 'Yellow', robe: '#7E22CE' },
  { order: 5, name: 'Most Senior Evangelist', line: 'both', garment: 'White or pink cassock, long pink robe, green-and-purple stranded cross-bar', loins: 'White with altar pattern', crosses: '3 in front; 3 on each end', strands: 'Purple', robe: '#F472B6' },
  { order: 6, name: 'Senior Evangelist', line: 'both', garment: 'White cassock, long blue robe, yellow-and-white stranded cross-bar', loins: 'White with altar pattern', crosses: '3', strands: 'Yellow', note: 'Full-time church worker', robe: '#2563EB' },
  { order: 7, name: 'Honorary Senior Evangelist', line: 'both', garment: 'White cassock, long green robe, yellow-and-white stranded cross-bar', loins: 'White with altar pattern', crosses: '3', strands: 'Yellow', robe: '#16A34A' },
  { order: 8, name: 'Evangelist', line: 'both', garment: 'White cassock, long grey robe, blue-and-yellow stranded cross-bar', loins: 'White with altar pattern', crosses: '3', strands: 'Yellow', note: 'Full-time church worker', robe: '#9CA3AF' },
  { order: 9, name: 'Honorary Evangelist', line: 'both', garment: 'White cassock, long yellow robe, blue-and-yellow stranded cross-bar', loins: 'White with altar pattern', crosses: '3', strands: 'Yellow', robe: '#FACC15' },
  { order: 10, name: 'Assistant Evangelist', line: 'both', garment: 'Leader sutana, long grey robe', loins: 'White', crosses: '3', strands: 'Yellow', note: 'Full-time church worker. Promotion from here up is by the Pastor, not automatic (cl. 186–188)', robe: '#9CA3AF' },
  { order: 11, name: 'Honorary Assistant Evangelist', line: 'both', garment: 'Leader sutana, long yellow robe', loins: 'White', crosses: '3', strands: 'Yellow', robe: '#FACC15' },
  { order: 12, name: 'Superior Senior Leader (full-time worker)', line: 'leader', garment: 'Laced leader sutana, grey top, blue cross-bar with yellow strand', loins: 'White', crosses: '3', strands: 'Yellow', robe: '#9CA3AF' },
  { order: 13, name: 'Superior Senior Woleader', line: 'prophet', garment: 'Cape with lace, blue top with lace', loins: 'Blue', crosses: '3', strands: 'White', note: 'Highest rank reached by promotion in the prophet line (cl. 186)', robe: '#93C5FD' },
  { order: 14, name: 'Superior Senior Leader', line: 'leader', garment: 'Leader sutana, laced yellow top, blue cross-bar with yellow strand', loins: 'White', crosses: '3', strands: 'Yellow', note: 'Highest rank reached by promotion in the leader line (cl. 186)', robe: '#FDE68A' },
  { order: 15, name: 'Senior Leader', line: 'leader', garment: 'Leader sutana, laced white top', loins: 'White', crosses: '3', strands: 'Yellow', robe: '#FFFFFF' },
  { order: 16, name: 'Senior Woleader', line: 'prophet', garment: 'Cape with lace, white top with lace', loins: 'Blue', crosses: '3', strands: 'White', robe: '#FFFFFF' },
  { order: 17, name: 'Leader', line: 'leader', garment: 'Leader sutana, unlaced white top', loins: 'White', crosses: '3', strands: 'Yellow', robe: '#FFFFFF' },
  { order: 18, name: 'Woleader', line: 'prophet', garment: 'Male sutana with four-corner neck, cape without lace, white top without lace', loins: 'Blue', crosses: '3', robe: '#FFFFFF' },
  { order: 19, name: 'Assistant Leader', line: 'leader', garment: 'Leader sutana, unlaced white top', loins: 'White', crosses: '1', strands: 'Yellow', robe: '#FFFFFF' },
  { order: 20, name: 'Senior Elder Brother', line: 'leader', garment: 'Brother sutana with laced cape', loins: 'White', crosses: '1', strands: 'Yellow', robe: '#FFFFFF' },
  { order: 21, name: 'Full Elder Brother', line: 'leader', garment: 'Brother sutana with cape', loins: 'White', crosses: '1', strands: 'Yellow', robe: '#FFFFFF' },
  { order: 22, name: 'Cape Elder Brother', line: 'leader', garment: 'Cape without lace', loins: 'White', crosses: '1', robe: '#FFFFFF' },
  { order: 23, name: 'Prophet', line: 'prophet', garment: 'Male sutana with four-corner neck', robe: '#FFFFFF' },
  { order: 24, name: 'Elder Brother', line: 'leader', garment: 'Brother sutana', loins: 'White, taped with blue', crosses: '1', robe: '#FFFFFF' },
  { order: 25, name: 'Brother', line: 'leader', garment: 'Brother sutana', robe: '#FFFFFF', note: 'Every member starts here after baptism' },
];

export const WOMEN_RANKS: Rank[] = [
  { order: 1, name: 'Lace Superior Senior Elder Sister', line: 'leader', garment: 'Round-neck cape with lace, yellow top with lace', loins: 'Yellow', crosses: '3', strands: 'White', robe: '#FDE68A' },
  { order: 2, name: 'Lace Superior Senior Prophetess', line: 'prophet', garment: 'Laced yellow top on a four-corner cape with lace', loins: 'Blue', crosses: '3', strands: 'White', robe: '#FDE68A' },
  { order: 3, name: 'Superior Senior Elder Sister', line: 'leader', garment: 'Round-neck cape with lace, yellow top without lace', loins: 'Yellow', crosses: '3', strands: 'White', robe: '#FEF3C7' },
  { order: 4, name: 'Superior Senior Prophetess', line: 'prophet', garment: 'Four-corner cape with lace, yellow top without lace', loins: 'Blue', crosses: '3', strands: 'White', robe: '#FEF3C7' },
  { order: 5, name: 'Senior Elder Sister', line: 'leader', garment: 'Round-neck cape with lace', loins: 'Yellow', crosses: '3', robe: '#FFFFFF' },
  { order: 6, name: 'Senior Prophetess', line: 'prophet', garment: 'Four-corner cape without lace', loins: 'Blue', crosses: '3', robe: '#FFFFFF' },
  { order: 7, name: 'Cape Elder Sister', line: 'leader', garment: 'Round-neck cape without lace', loins: 'Yellow', crosses: '1', robe: '#FFFFFF' },
  { order: 8, name: 'Wolima', line: 'prophet', garment: 'Female sutana with four-corner neck', loins: 'Blue', crosses: '1', robe: '#FFFFFF' },
  { order: 9, name: 'Prophetess', line: 'prophet', garment: 'Female sutana with four-corner neck', robe: '#FFFFFF' },
  { order: 10, name: 'Sister', line: 'leader', garment: 'Sister sutana', robe: '#FFFFFF', note: 'Every member starts here after baptism' },
];

export const ALL_RANKS = [...MEN_RANKS.map(r => r.name), ...WOMEN_RANKS.map(r => r.name)];

/** How the Church is governed (Constitution 1980) */
export const HIERARCHY: { level: string; who: string; detail: string; source: string }[] = [
  { level: 'The Pastor', who: 'Pastor & Spiritual Head', detail: 'The ultimate authority of the Church worldwide; chairs the Pastor-in-Council.', source: 'cl. 156' },
  { level: 'Pastor-in-Council & Board of Trustees', who: 'Pastor (chairman), Head of the Diocese and Deputy, other Trustees, members co-opted by the Pastor', detail: 'The overall machinery of government.', source: 'cl. 156–157' },
  { level: 'Headquarters', who: 'Supreme Headquarters (Porto-Novo, Benin) · International Headquarters (Mission House, Ketu, Lagos)', detail: 'The Church came into the world in Porto-Novo in 1947; Ketu is the international headquarters.', source: 'cl. 1' },
  { level: 'Diocese', who: 'Head of the Diocese · National (Diocesan) Headquarters', detail: 'The Church in a country, e.g. Nigeria Diocese, headquartered at 12/15 Church Street, Makoko, Yaba, Lagos.', source: 'cl. 1' },
  { level: 'Provinces, regions, states', who: 'Provincial / regional / state heads', detail: 'Groupings used by dioceses as they grow; names and boundaries are set by each diocese.', source: 'practice' },
  { level: 'Districts & circuits', who: 'Pastor’s Representatives of the rank of Assistant Evangelist and above', detail: 'Groups of parishes ministered to together.', source: 'Definitions' },
  { level: 'Parish', who: 'Shepherd-in-charge (the Pastor’s Representative) · Parochial Committee', detail: 'An individual congregation; its Representative, an Elder, Leader or higher, performs all the duties of the spiritual leader.', source: 'cl. 112' },
  { level: 'Members', who: 'Laity, church workers and the ranks above', detail: 'Members are baptised, then anointed after steady worship; ranks are distinguished by robes.', source: 'cl. 185, 198' },
];

/** Practice and symbols (Constitution 1980 unless noted) */
export const ASSETS: { title: string; text: string; source: string }[] = [
  { title: 'The emblem', text: 'The Church’s emblem shows an eye, a crown and a cross with the Church’s name. One reading: the eye is the eye of the Lord upon His people, and the cross, the work, comes before the crown. Accounts differ on the rainbow: one says the name was first written in the form of a bow and the rainbow was added at the Church’s 50th anniversary (1997). Ask your parish for the official description.', source: 'Celestial Weekly “Ask an Elder”; Celestial Church Blog' },
  { title: 'White garment (sutana)', text: 'Members worship in a white garment; ranks are distinguished by the robe, cape, loins, crosses and strands worn over it. Shoes are not worn with the sutana or within the church premises.', source: 'cl. 185; prohibitions' },
  { title: 'The altar', text: 'The altar area is rectangular, faces EAST, and is cut off from the rest of the church by a hand-railing along its full width. The setting of the altar and the seats was revealed by the Holy Spirit.', source: 'cl. 94, 177' },
  { title: 'Candles', text: 'Only white candles are used; coloured candles are forbidden. The number of candles differs for each type of service.', source: 'cl. 94; prohibitions' },
  { title: 'Holy water and sanctification', text: 'Members dip their hands in the holy water by the door and make the sign of the cross before entering. New members are sanctified with a pail of water and a candle by the Pastor’s Representative.', source: 'cl. 105, 194' },
  { title: 'Seating', text: 'The seating arrangement was revealed through a prophetess who, in the wilderness on Friday 5 October 1947, sketched it using oranges.', source: 'cl. 94' },
  { title: 'Baptism and anointment', text: 'After baptism comes anointment, performed only by the Pastor, usually once a year at the Christmas/New Year period.', source: 'cl. 198' },
  { title: 'What members keep from', text: 'Tobacco and smoking of any kind; alcohol and strong drink; pork and food offered to idols. Women during menstruation keep from the church precincts until sanctified after seven clear days, and do not enter the altar area or lead the congregation in worship.', source: 'prohibitions; cl. 189' },
  { title: 'Colours', text: 'White is the garment of worship. Blue marks the prophet line’s loins and many robes; purple, pink, green, grey and yellow robes mark the senior ranks, and yellow, white or purple strands the cross-bars (see the ranks above).', source: 'Spiritual Ranks chart' },
];
