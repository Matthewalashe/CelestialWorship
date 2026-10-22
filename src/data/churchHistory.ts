/**
 * History, ideals and the common ground shared by every part of the Celestial Church of Christ.
 *
 * Sources: the 1980 Constitution (Nigeria Diocese), the church's own published history
 * (celestialchurch.com), and Wikipedia's article on the church. Disputed matters are stated
 * as what each side holds, without taking a side.
 */

export interface TimelineEvent {
  date: string;
  title: string;
  detail: string;
  source: string;
}

export const TIMELINE: TimelineEvent[] = [
  { date: '1909', title: 'The Founder is born', detail: 'Samuel Bilehou Joseph Oshoffa is born in Porto-Novo, Dahomey (now Benin), to a Methodist father and a mother from Imeko. He trains as a carpenter and later trades in ebony.', source: 'Constitution, Foundation History' },
  { date: '23 May 1947', title: 'The call in the forest', detail: 'On the day of an eclipse of the sun, while in the forest, the Founder hears the call of God and spends about three months in the wilderness.', source: 'Constitution, Foundation History' },
  { date: '29 Sep 1947', title: 'The Divine Order', detail: 'During prayer, a winged angel bathed in light delivers God’s commission to preach to the world. The Celestial Church of Christ is born in Porto-Novo.', source: 'Constitution, clauses 1–2' },
  { date: '5 Oct 1947', title: 'The seating arrangement is revealed', detail: 'A prophetess, under the Holy Spirit in the wilderness, sketches the seating arrangement of the church using oranges.', source: 'Constitution, clause 94' },
  { date: 'Passion Week 1951', title: 'The Church enters Nigeria', detail: 'Fishermen from the Gbaji branch carry the Church to Lagos. After repeated invitations, the Founder travels to Lagos for the first time with Moses Ajovi in Passion Week 1951; an early centre grows at Makoko, Yaba.', source: 'Constitution, clauses 42–43' },
  { date: '24 Nov 1958', title: 'Registered in Nigeria', detail: 'The Church is incorporated in Nigeria under the Land (Perpetual Succession) Ordinance.', source: 'Constitution, Deed of Constitution' },
  { date: '1965', title: 'Recognised in Dahomey', detail: 'The Republic of Dahomey formally recognises the Church.', source: 'Wikipedia' },
  { date: '15 Jul 1977', title: 'Appearance of Holy Mary', detail: 'The Pastor sees Holy Mary in a vision. Holy Mary’s Day is first observed on Friday 7 July 1978 and is kept on the first Friday of July.', source: 'Constitution, clause 99(g)' },
  { date: '29 Mar 1980', title: 'New Constitution', detail: 'The revised Constitution of the Nigeria Diocese, drafted from 29 February 1976, is promulgated.', source: 'Constitution' },
  { date: '1985', title: 'The Founder passes on', detail: 'The Founder dies in Nigeria and is buried at Imeko, as he had directed. Imeko becomes the Celestial City, a place of pilgrimage.', source: 'Constitution, clauses 8–9; Wikipedia' },
  { date: '1985–2000', title: 'Pastor A. A. Bada', detail: 'Alexander Abiodun Adebayo Bada leads the Church until his death on 8 September 2000.', source: 'Wikipedia' },
  { date: '2000–2001', title: 'Pastor P. H. Ajose', detail: 'Philip Hunsu Ajose leads briefly and dies in March 2001.', source: 'Wikipedia' },
  { date: 'Since 2001', title: 'A contested succession', detail: 'Different parts of the Church recognise different leaders as Pastor. Calls for unity continue from all sides.', source: 'Wikipedia; City People Magazine' },
];

/** Beliefs and practices every part of the Church holds in common */
export const COMMON_GROUND: { title: string; detail: string; source: string }[] = [
  { title: 'One Founder, one Divine Order', detail: 'Every Celestian traces the Church to the Divine Order given to Rev. S. B. J. Oshoffa in Porto-Novo on 29 September 1947. The title “Pastor and Founder” belongs to him alone.', source: 'Clauses 1–2, 110' },
  { title: 'One and indivisible', detail: 'The Constitution calls the Church “one and indivisible” with “one Head who shall be known and called The Pastor” — a unity every group says it is working for.', source: 'Clauses 107, 109' },
  { title: 'Jesus Christ, Lord and Saviour', detail: 'Membership is for all who accept Jesus Christ as the Son of God and only Lord and Saviour, and are baptised into the Church.', source: 'Clauses 101–102' },
  { title: 'Worship revealed by the Holy Spirit', detail: 'The name of the Church, its tenets, its mode of worship and its hymns are held to be revealed by the Holy Spirit (John 14:25–26).', source: 'Clause 91' },
  { title: 'The twelve tenets', detail: 'No idols, fetish or charms; no tobacco or alcohol; no pork or food offered to idols; white candles only; holiness in body and soul.', source: 'Clause 93' },
  { title: 'The white garment and bare feet', detail: 'Worship in the white sutana, without shoes in the church and its premises.', source: 'Clause 93(6)' },
  { title: 'The same rites and seasons', detail: 'Baptism by immersion, Holy Communion, the washing of feet in Holy Week, Easter, Harvest Thanksgiving, Holy Mary’s Day and the Christmas convocation.', source: 'Clause 99' },
  { title: 'The same Order of Service and hymns', detail: 'The Order of Service and the hymn book are shared across the Church.', source: 'Clauses 95–96' },
  { title: 'Porto-Novo, Ketu and Imeko', detail: 'Porto-Novo is the birthplace and Supreme Headquarters, Ketu the International Headquarters, and Imeko the holy ground where the Founder lies.', source: 'Clauses 6–9, 107' },
];

/** What is disputed, stated neutrally */
export const POINTS_OF_DIFFERENCE: { title: string; detail: string }[] = [
  { title: 'Who holds the office of Pastor', detail: 'The Constitution says the successor is revealed by God to the incumbent Pastor and may come from any rank (clause 111). Since 2001, different groups have recognised different leaders.' },
  { title: 'Where the Pastor sits', detail: 'Clause 6 places the Pastor’s headquarters in Porto-Novo, while clause 107 names Ketu as the International Headquarters. Groups weigh these differently.' },
  { title: 'Which rules apply today', detail: 'Editions of the Constitution, later directives and court rulings are read differently by different groups.' },
];

export const APP_POSITION =
  'CelestialWorship serves every Celestian, whichever leadership their parish recognises. It uses the hymns, the Order of '
  + 'Service and the tenets that all parts of the Church share, presents disputed matters without taking a side, and '
  + 'prays — as every group says it does — for the Church to be one again.';

/** The Church’s published vision and mission */
export const VISION = 'To evangelize the world through the proclamation of the Word.';

export const MISSION: string[] = [
  'Worship God in holiness and in truth',
  'Preach the Gospel of Jesus Christ and the Kingdom of God',
  'Prepare believers for the return of Christ',
  'Work for the unity of Christians',
  'Run schools and centres of learning and research',
  'Restore family values',
  'Organise charitable work',
  'Promote crime-free and drug-free communities',
];

export const SOURCES = [
  { label: 'Constitution of the Celestial Church of Christ (Nigeria Diocese), 1980', url: '' },
  { label: 'Brief History — celestialchurch.com', url: 'https://celestialchurch.com/about-us-2/brief-history-of-celestial-church-of-christ/' },
  { label: 'Celestial Church of Christ — Wikipedia', url: 'https://en.wikipedia.org/wiki/Celestial_Church_of_Christ' },
  { label: 'Why CELE Church has been in crisis — City People Magazine', url: 'https://www.citypeopleonline.com/cele-church-crisis-32-yrs/' },
];
