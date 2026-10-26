/**
 * The Founder, the Pastor and those who have led the Church, with photographs that are free to use
 * (Wikimedia Commons, CC BY-SA 4.0, credited where shown). Dates from Wikipedia.
 * The Board of Trustees and the Pastor-in-Council are described from the Constitution; their members are
 * listed once the Church confirms them.
 */

export interface Leader {
  name: string;
  role: string;
  years: string;
  detail: string;
  photo?: { src: string; alt: string; caption?: string; credit: string; license: string; source: string };
}

export const FOUNDER: Leader = {
  name: 'Rev. Samuel Bilewu Joseph Oshoffa',
  role: 'Pastor and Founder',
  years: '11 October 1909 – 10 September 1985',
  detail: 'Received the Divine Order in Porto-Novo on 29 September 1947 and founded the Celestial Church of Christ. The title “Pastor and Founder” belongs to him alone.',
  photo: {
    src: '/leaders/founder-sbj-oshoffa.jpg',
    alt: 'Rev. S. B. J. Oshoffa, seated, in a white and gold cap and a blue and white robe, holding a Bible',
    credit: 'Jouslaw', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:SBJ_oshoffa_.jpg',
  },
};

export const PASTOR: Leader = {
  name: 'Rev. Emmanuel Mobiyina Oshoffa',
  role: 'Pastor, Celestial Church of Christ Worldwide',
  years: 'Since December 2002',
  detail: 'Son of the Founder, born 25 December 1948. Installed as Pastor in December 2002, with the International Headquarters at Ketu, Lagos.',
  photo: {
    src: '/leaders/pastor-emmanuel-oshoffa.jpg',
    alt: 'Rev. Emmanuel Oshoffa, seen from behind in a white and gold sutana, before the altar with seven candles',
    caption: 'At the altar, Christmas Eve service, Celestial City, Imeko (2018)',
    credit: 'Temisope', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Emmanuel_Oshoffa.jpg',
  },
};

export const PAST_PASTORS: Leader[] = [
  { name: 'Rev. Alexander Abiodun Adebayo Bada', role: 'Second Pastor', years: 'December 1985 – 8 September 2000',
    detail: 'Born 4 December 1930. Succeeded the Founder and led the Church for fifteen years.' },
  { name: 'Rev. Philip Hunsu Ajose', role: 'Third Pastor', years: '2 October 2000 – 2 March 2001',
    detail: 'Born 10 August 1932. Declared Pastor on 24 December 2000; died a few months later.' },
];

export const GOVERNING_BODIES: { name: string; detail: string; source: string }[] = [
  { name: 'Pastor-in-Council',
    detail: 'Governs the Church under the ultimate authority of the Pastor: the Pastor (Chairman), the Head of the Diocese and his Deputy, the other members of the Board of Trustees, and members the Pastor co-opts. It interprets the doctrine and the Constitution.',
    source: 'Constitution, clauses 156, 157, 183' },
  { name: 'Board of Trustees',
    detail: 'Holds the Church’s property and prepared the Constitution for the Pastor-in-Council. Members are appointed by the Pastor.',
    source: 'Constitution (1980), preface' },
];
