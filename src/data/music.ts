/**
 * Quiet music for devotion and Bible reading: public-domain and openly licensed recordings,
 * streamed from Wikimedia Commons (nothing is downloaded with the app), and Celestial hymn
 * tunes played on the device from the hymnal's solfa (utils/hymnTune.ts).
 */

export interface Track { title: string; kind: 'hymn' | 'instrumental'; src: string; credit: string; license: string; page: string }

const C = 'https://upload.wikimedia.org/wikipedia/commons';
const PAGE = 'https://commons.wikimedia.org/wiki/File:';

export const TRACKS: Track[] = [
  { title: 'Amazing Grace', kind: 'hymn', src: `${C}/transcoded/2/21/Amazing_Grace_US_Marine_Band.ogg/Amazing_Grace_US_Marine_Band.ogg.mp3`,
    credit: 'United States Marine Band', license: 'Public domain', page: `${PAGE}Amazing_Grace_US_Marine_Band.ogg` },
  { title: 'Nearer, My God, to Thee', kind: 'hymn', src: `${C}/b/bf/Nearer_My_God_to_Thee_-_Ceremonial_Brass_-_United_States_Air_Force_Band.mp3`,
    credit: 'United States Air Force Band, Ceremonial Brass', license: 'Public domain', page: `${PAGE}Nearer_My_God_to_Thee_-_Ceremonial_Brass_-_United_States_Air_Force_Band.mp3` },
  { title: 'Eternal Father, Strong to Save', kind: 'hymn', src: `${C}/transcoded/6/66/Eternal_Father%2C_Strong_to_Save_-_U.S._Marine_Band.ogg/Eternal_Father%2C_Strong_to_Save_-_U.S._Marine_Band.ogg.mp3`,
    credit: 'United States Marine Band', license: 'Public domain', page: `${PAGE}Eternal_Father,_Strong_to_Save_-_U.S._Marine_Band.ogg` },
  { title: 'When I Survey the Wondrous Cross', kind: 'hymn', src: `${C}/transcoded/5/55/When_I_Survey_Organ.oga/When_I_Survey_Organ.oga.mp3`,
    credit: 'RandomCanadian (organ)', license: 'CC BY-SA 4.0', page: `${PAGE}When_I_Survey_Organ.oga` },
  { title: 'There Is a Green Hill Far Away', kind: 'hymn', src: `${C}/transcoded/c/c0/There_is_a_green_hill_Organ.oga/There_is_a_green_hill_Organ.oga.mp3`,
    credit: 'RandomCanadian (organ)', license: 'CC BY-SA 4.0', page: `${PAGE}There_is_a_green_hill_Organ.oga` },
  { title: 'Holy, Holy, Holy', kind: 'hymn', src: `${C}/transcoded/0/0d/Holy%2C_Holy%2C_Holy.ogg/Holy%2C_Holy%2C_Holy.ogg.mp3`,
    credit: 'L293D', license: 'CC BY-SA 4.0', page: `${PAGE}Holy,_Holy,_Holy.ogg` },
  { title: 'Abide with Me (Eventide)', kind: 'hymn', src: `${C}/transcoded/a/aa/Eventide.ogg/Eventide.ogg.mp3`,
    credit: 'Wikimedia Commons contributor', license: 'CC BY-SA 2.5', page: `${PAGE}Eventide.ogg` },
  { title: 'Air on the G String: J. S. Bach', kind: 'instrumental', src: `${C}/e/ec/Air_-_Air_Force_Strings_-_United_States_Air_Force_Band.mp3`,
    credit: 'United States Air Force Band, Air Force Strings', license: 'Public domain', page: `${PAGE}Air_-_Air_Force_Strings_-_United_States_Air_Force_Band.mp3` },
  { title: 'Jesu, Joy of Man’s Desiring: J. S. Bach', kind: 'instrumental', src: `${C}/transcoded/2/27/Bach%2C_BWV_147%2C_10._Jesus_bleibet_meine_Freude.ogg/Bach%2C_BWV_147%2C_10._Jesus_bleibet_meine_Freude.ogg.mp3`,
    credit: 'Orchestra Gli Armonici', license: 'CC0', page: `${PAGE}Bach,_BWV_147,_10._Jesus_bleibet_meine_Freude.ogg` },
  { title: 'Aria, Goldberg Variations: J. S. Bach', kind: 'instrumental', src: `${C}/transcoded/a/af/Bach%2C_Goldberg_Variations%2C_Aria_%28Musopen_version%29.ogg/Bach%2C_Goldberg_Variations%2C_Aria_%28Musopen_version%29.ogg.mp3`,
    credit: 'Musopen', license: 'CC0', page: `${PAGE}Bach,_Goldberg_Variations,_Aria_(Musopen_version).ogg` },
  { title: 'Clair de lune: Debussy', kind: 'instrumental', src: `${C}/transcoded/b/be/Clair_de_lune_%28Claude_Debussy%29_Suite_bergamasque.ogg/Clair_de_lune_%28Claude_Debussy%29_Suite_bergamasque.ogg.mp3`,
    credit: 'Public-domain recording', license: 'Public domain', page: `${PAGE}Clair_de_lune_(Claude_Debussy)_Suite_bergamasque.ogg` },
];
