/**
 * Words said in full at points the Order of Service only names ("The Lord's Prayer", "Gloria", "The Creed").
 * English: as given in the Celestial Church of Christ service guide (note "give me … forgive me" in the
 * Lord's Prayer, and "the Celestial Church of Christ" in the Creed). Yorùbá: standard church wording,
 * adapted to match; to be checked by the Church.
 */

export type PrayerRef = 'lords_prayer' | 'gloria' | 'creed' | 'holy_holy';

export const PRAYERS: Record<PrayerRef, { title: string; en: string; yo: string; fr?: string; repeat?: number; review?: boolean }> = {
  lords_prayer: {
    title: "The Lord's Prayer",
    en: "Our Father, who art in heaven, hallowed be thy name; thy kingdom come; thy will be done on earth as it is in heaven. Give me this day my daily bread, and forgive me my trespasses, as I forgive those who trespass against me; and lead me not into temptation, but deliver me from evil. For thine is the kingdom, the power and the glory, for ever and ever. Amen.",
    yo: 'Baba wa ti mbẹ li ọrun, ọ̀wọ̀ ni orukọ rẹ. Ki ijọba rẹ de. Ifẹ tirẹ ni ki a ṣe li aiye, bi a ti nṣe li ọrun. Fun mi li onjẹ oọjọ mi loni. Dari gbese mi ji mi, bi mo ti ndari ji awọn ti o jẹ mi ni gbese. Ma si fà mi sinu idẹwò, ṣugbọn gbà mi lọwọ bilisi. Nitori ijọba ni tirẹ, ati agbara, ati ogo, lai ati lailai. Amin.',
    fr: 'Notre Père qui es aux cieux, que ton nom soit sanctifié ; que ton règne vienne ; que ta volonté soit faite sur la terre comme au ciel. Donne-moi aujourd’hui mon pain quotidien ; pardonne-moi mes offenses, comme je pardonne à ceux qui m’ont offensé ; et ne me soumets pas à la tentation, mais délivre-moi du mal. Car c’est à toi qu’appartiennent le règne, la puissance et la gloire, aux siècles des siècles. Amen.',
    review: true,
  },
  gloria: {
    title: 'Gloria',
    en: 'Glory be to the Father, and to the Son, and to the Holy Ghost; as it was in the beginning, is now, and ever shall be, world without end. Amen.',
    yo: 'Ogo ni fun Baba, ati fun Ọmọ, ati fun Ẹmi Mimọ; bi o ti wà li atetekọṣe, bẹ̃ni nisisiyi, bẹ̃ni yio si ri lai ati lailai. Amin.',
    fr: 'Gloire au Père, au Fils et au Saint-Esprit, comme il était au commencement, maintenant et toujours, et pour les siècles des siècles. Amen.',
  },
  creed: {
    title: 'The Creed',
    en: 'I believe in God, the Father Almighty, maker of heaven and earth; and in Jesus Christ his only Son our Lord, who was conceived by the Holy Ghost, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, dead and buried. He descended into hell; the third day he rose again from the dead; he ascended into heaven, and sitteth at the right hand of God the Father Almighty; from thence he shall come to judge the living and the dead. I believe in the Holy Ghost, the Celestial Church of Christ, the Communion of Saints, the forgiveness of sins, and the life everlasting. Amen.',
    yo: 'Mo gbà Ọlọrun Baba Olodumare gbọ́, Ẹlẹda ọrun on aiye; ati Jesu Kristi Ọmọ bibi rẹ̀ kanṣoṣo, Oluwa wa, ẹniti a lóyun rẹ̀ lati ọdọ Ẹmi Mimọ, ti a bí ninu Maria Wundia, ti o jìya labẹ Pontiu Pilatu, ti a kàn mọ agbelebu, o kú, a si sin i; o sọkalẹ lọ si ipo-oku; ni ijọ kẹta o jinde kuro ninu oku; o gòke re ọrun, o si joko li ọwọ ọtún Ọlọrun Baba Olodumare; lati ibẹ̀ ni yio ti wá ṣe idajọ ãye ati okú. Mo gbà Ẹmi Mimọ gbọ́; Ijọ Mimọ ti Kristi lati Ọrun wá; Idapọ awọn eniyan mimọ; Idariji ẹ̀ṣẹ; ati iye ainipẹkun. Amin.',
    fr: 'Je crois en Dieu, le Père tout-puissant, créateur du ciel et de la terre ; et en Jésus-Christ, son Fils unique, notre Seigneur, qui a été conçu du Saint-Esprit, est né de la Vierge Marie, a souffert sous Ponce Pilate, a été crucifié, est mort et a été enseveli, est descendu aux enfers ; le troisième jour est ressuscité des morts, est monté aux cieux, est assis à la droite de Dieu le Père tout-puissant, d’où il viendra juger les vivants et les morts. Je crois en l’Esprit Saint, à l’Église du Christianisme Céleste, à la communion des saints, à la rémission des péchés et à la vie éternelle. Amen.',
    review: true,
  },
  holy_holy: {
    title: 'Words of adoration',
    en: 'Holy! Holy! Holy! To the Lord God of Hosts.',
    yo: 'Mimọ! Mimọ! Mimọ! Ni Oluwa Ọlọrun awọn ọmọ-ogun.',
    fr: 'Saint ! Saint ! Saint ! Au Seigneur, Dieu des armées.',
    repeat: 3,
  },
};

/** The collection on the Lord's Day is given in five parts; at other services it is one offering */
export const LORDS_DAY_OFFERINGS: { en: string; yo: string; fr: string }[] = [
  { en: 'General offering', yo: 'Owo Igba', fr: 'Offrande générale' },
  { en: 'Evangelism giving', yo: 'Irin Ajo', fr: 'Don pour l’évangélisation' },
  { en: 'Development offering', yo: 'Ikole', fr: 'Offrande pour le développement' },
  { en: 'Charity giving', yo: 'Itore Anu', fr: 'Don de charité' },
  { en: 'Tithe', yo: 'Idamewa', fr: 'Dîme' },
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
