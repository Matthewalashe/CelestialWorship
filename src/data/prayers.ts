/**
 * Words said in full at points the Order of Service only names ("The Lord's Prayer", "Gloria", "The Creed").
 * English: as given in the Celestial Church of Christ service guide (note "give me … forgive me" in the
 * Lord's Prayer, and "the Celestial Church of Christ" in the Creed). Yorùbá: standard church wording,
 * adapted to match and written with full tone marks; to be checked by the Church.
 */

export type PrayerRef = 'lords_prayer' | 'gloria' | 'creed' | 'holy_holy';

export const PRAYERS: Record<PrayerRef, { title: string; en: string; yo: string; fr?: string; repeat?: number; review?: boolean }> = {
  lords_prayer: {
    title: "The Lord's Prayer",
    en: "Our Father, who art in heaven, hallowed be thy name; thy kingdom come; thy will be done on earth as it is in heaven. Give me this day my daily bread, and forgive me my trespasses, as I forgive those who trespass against me; and lead me not into temptation, but deliver me from evil. For thine is the kingdom, the power and the glory, for ever and ever. Amen.",
    yo: 'Baba wa tí ń bẹ ní ọ̀run, ọ̀wọ̀ ni orúkọ Rẹ. Kí ìjọba Rẹ dé. Ìfẹ́ Tìrẹ ni kí a ṣe ní ayé, bí a ti ń ṣe ní ọ̀run. Fún mi ní oúnjẹ òòjọ́ mi lónìí. Dárí gbèsè mi jì mí, bí mo ti ń dárí jì àwọn tí ó jẹ mí ní gbèsè. Má sì fà mí sínú ìdẹwò, ṣùgbọ́n gbà mí lọ́wọ́ bìlísì. Nítorí ìjọba ni Tìrẹ, àti agbára, àti ògo, láé àti láéláé. Àmín.',
    fr: 'Notre Père qui es aux cieux, que ton nom soit sanctifié ; que ton règne vienne ; que ta volonté soit faite sur la terre comme au ciel. Donne-moi aujourd’hui mon pain quotidien ; pardonne-moi mes offenses, comme je pardonne à ceux qui m’ont offensé ; et ne me soumets pas à la tentation, mais délivre-moi du mal. Car c’est à toi qu’appartiennent le règne, la puissance et la gloire, aux siècles des siècles. Amen.',
    review: true,
  },
  gloria: {
    title: 'Gloria',
    en: 'Glory be to the Father, and to the Son, and to the Holy Ghost; as it was in the beginning, is now, and ever shall be, world without end. Amen.',
    yo: 'Ògo ni fún Baba, àti fún Ọmọ, àti fún Ẹ̀mí Mímọ́; bí ó ti wà ní àtètèkọ́ṣe, bẹ́ẹ̀ ni nísinsìnyí, bẹ́ẹ̀ ni yóò sì rí láé àti láéláé. Àmín.',
    fr: 'Gloire au Père, au Fils et au Saint-Esprit, comme il était au commencement, maintenant et toujours, et pour les siècles des siècles. Amen.',
  },
  creed: {
    title: 'The Creed',
    en: 'I believe in God, the Father Almighty, maker of heaven and earth; and in Jesus Christ his only Son our Lord, who was conceived by the Holy Ghost, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, dead and buried. He descended into hell; the third day he rose again from the dead; he ascended into heaven, and sitteth at the right hand of God the Father Almighty; from thence he shall come to judge the living and the dead. I believe in the Holy Ghost, the Celestial Church of Christ, the Communion of Saints, the forgiveness of sins, and the life everlasting. Amen.',
    yo: 'Mo gba Ọlọ́run Baba Olódùmarè gbọ́, Ẹlẹ́dàá ọ̀run àti ayé; àti Jésù Kírísítì Ọmọ bíbí Rẹ̀ kan ṣoṣo, Olúwa wa, ẹni tí a lóyún Rẹ̀ láti ọ̀dọ̀ Ẹ̀mí Mímọ́, tí a bí nínú Màríà Wúńdíá, tí ó jìyà lábẹ́ Pọ́ńtíù Pílátù, tí a kàn mọ́ àgbélébùú, ó kú, a sì sin Ín; ó sọ̀kalẹ̀ lọ sí ipò òkú; ní ijọ́ kẹta ó jíǹde kúrò nínú òkú; ó gòkè re ọ̀run, ó sì jókòó ní ọwọ́ ọ̀tún Ọlọ́run Baba Olódùmarè; láti ibẹ̀ ni yóò ti wá ṣe ìdájọ́ ààyè àti òkú. Mo gba Ẹ̀mí Mímọ́ gbọ́; Ìjọ Mímọ́ ti Kírísítì láti Ọ̀run Wá; Ìdàpọ̀ àwọn ènìyàn mímọ́; Ìdáríjì ẹ̀ṣẹ̀; àti ìyè àìnípẹ̀kun. Àmín.',
    fr: 'Je crois en Dieu, le Père tout-puissant, créateur du ciel et de la terre ; et en Jésus-Christ, son Fils unique, notre Seigneur, qui a été conçu du Saint-Esprit, est né de la Vierge Marie, a souffert sous Ponce Pilate, a été crucifié, est mort et a été enseveli, est descendu aux enfers ; le troisième jour est ressuscité des morts, est monté aux cieux, est assis à la droite de Dieu le Père tout-puissant, d’où il viendra juger les vivants et les morts. Je crois en l’Esprit Saint, à l’Église du Christianisme Céleste, à la communion des saints, à la rémission des péchés et à la vie éternelle. Amen.',
    review: true,
  },
  holy_holy: {
    title: 'Words of adoration',
    en: 'Holy! Holy! Holy! To the Lord God of Hosts.',
    yo: 'Mímọ́! Mímọ́! Mímọ́! Ni Olúwa Ọlọ́run àwọn ọmọ-ogun.',
    fr: 'Saint ! Saint ! Saint ! Au Seigneur, Dieu des armées.',
    repeat: 3,
  },
};

/** The collection on the Lord's Day is given in five parts; at other services it is one offering */
export const LORDS_DAY_OFFERINGS: { en: string; yo: string; fr: string }[] = [
  { en: 'General offering', yo: 'Owó Igbá', fr: 'Offrande générale' },
  { en: 'Evangelism giving', yo: 'Ìrìn Àjò', fr: 'Don pour l’évangélisation' },
  { en: 'Development offering', yo: 'Ìkọ́lé', fr: 'Offrande pour le développement' },
  { en: 'Charity giving', yo: 'Ìtọrẹ Àánú', fr: 'Don de charité' },
  { en: 'Tithe', yo: 'Ìdámẹ́wàá', fr: 'Dîme' },
];

/** Who does what, as shown beside each act */
export const WHO_LABELS: Record<string, string> = {
  conductor: 'Service conductor',
  congregation: 'Congregation',
  all: 'Everyone',
  shepherd: 'Shepherd',
  preacher: 'Preacher',
  incense: 'Incense bearer',
  choir: 'Choir',
  secretary: 'Parish secretary',
  prophet: 'Prophet',
  female: 'A female member',
  male: 'A male member',
  member: 'A member',
  elders: 'Elders',
  parents: 'Parents',
  couple: 'The couple',
  reader: 'Reader',
};
