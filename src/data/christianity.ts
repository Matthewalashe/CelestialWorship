/**
 * How the Gospel spread, told place by place for the world map: what happened, why it mattered, and something
 * to remember. Dates are those of standard histories (approximate where marked "about"). And the lands of the
 * Bible by their names then and now, with the flag of each country today, for the map's legend.
 */

export interface SpreadStop {
  id: string;
  /** Year as shown, e.g. "AD 30", "about AD 50" */
  when: string;
  title: string;
  place: string;
  today: string;
  lat: number;
  lon: number;
  zoom: number;
  story: string;
  why: string;
  didYouKnow: string;
  source: string;
}

export const SPREAD: SpreadStop[] = [
  { id: 'jerusalem', when: 'AD 30', title: 'Pentecost', place: 'Jerusalem', today: 'Jerusalem', lat: 31.777, lon: 35.235, zoom: 9,
    story: 'Fifty days after the resurrection, the Holy Spirit came upon the disciples. Peter preached, and about three thousand were baptised in one day.',
    why: 'The Church was born. Pilgrims from Africa, Asia and Europe heard the Gospel “in our own tongue” and carried it home.',
    didYouKnow: 'Among the crowd were people from Egypt and Libya “about Cyrene”: Africa heard the Gospel on the very first day.', source: 'Acts 2:1-41' },
  { id: 'gaza-road', when: 'about AD 34', title: 'The Ethiopian believes', place: 'The road to Gaza', today: 'Gaza', lat: 31.40, lon: 34.40, zoom: 8,
    story: 'Philip met the treasurer of Candace, queen of the Ethiopians, reading Isaiah in his chariot. He believed and was baptised on the spot.',
    why: 'One of the first Gentile believers was an African official, who went home rejoicing.',
    didYouKnow: 'The kingdom of Candace was in Nubia, on the Nile in today’s Sudan.', source: 'Acts 8:26-39' },
  { id: 'damascus', when: 'about AD 34', title: 'Saul becomes Paul', place: 'Damascus', today: 'Damascus, Syria', lat: 33.511, lon: 36.306, zoom: 8,
    story: 'On the road to Damascus a light from heaven struck Saul, the persecutor. Three days later Ananias laid hands on him and he was baptised.',
    why: 'The fiercest enemy became the great apostle to the nations; thirteen New Testament letters bear his name.',
    didYouKnow: '“The street which is called Straight” still crosses the old city of Damascus.', source: 'Acts 9:1-22' },
  { id: 'antioch', when: 'about AD 40', title: 'First called Christians', place: 'Antioch in Syria', today: 'Antakya, Turkey', lat: 36.203, lon: 36.161, zoom: 7,
    story: 'Believers scattered by persecution preached to Greeks in Antioch, and a great number believed. Barnabas and Paul taught there a whole year.',
    why: 'Antioch became the base of mission: from here Paul and Barnabas were sent out to the nations.',
    didYouKnow: 'Antioch was then the third city of the Roman Empire, after Rome and Alexandria.', source: 'Acts 11:19-26; 13:1-3' },
  { id: 'philippi', when: 'about AD 49', title: 'The Gospel reaches Europe', place: 'Philippi, Macedonia', today: 'near Kavala, Greece', lat: 41.013, lon: 24.286, zoom: 7,
    story: 'After a vision of a man of Macedonia, Paul crossed to Europe. Lydia believed by the riverside, and a jailer was baptised after an earthquake.',
    why: 'The first church in Europe, and a church Paul loved; his letter to it is full of joy.',
    didYouKnow: 'Lydia was a seller of purple cloth from Thyatira, in Asia: a businesswoman whose home became the church.', source: 'Acts 16:9-40' },
  { id: 'ephesus', when: 'about AD 53', title: 'The word grows mightily', place: 'Ephesus', today: 'near Selçuk, Turkey', lat: 37.941, lon: 27.342, zoom: 7,
    story: 'Paul taught in Ephesus for two years “so that all they which dwelt in Asia heard the word”. Magic books worth fifty thousand pieces of silver were burnt.',
    why: 'From Ephesus the Gospel spread through the province of Asia, to the seven churches of Revelation.',
    didYouKnow: 'The theatre where the crowd shouted “Great is Diana of the Ephesians” still stands; it held about 25,000 people.', source: 'Acts 19' },
  { id: 'rome', when: 'about AD 60', title: 'Paul in Rome', place: 'Rome', today: 'Rome, Italy', lat: 41.893, lon: 12.485, zoom: 6,
    story: 'Paul arrived in Rome as a prisoner and lived two years in a rented house, “preaching the kingdom of God… no man forbidding him”.',
    why: 'The Gospel reached the capital of the empire. Peter and Paul were both put to death in Rome under Nero.',
    didYouKnow: 'Paul had written his letter to the Romans before he ever saw the city.', source: 'Acts 28:16-31' },
  { id: 'alexandria', when: 'about AD 60', title: 'Mark in Africa', place: 'Alexandria', today: 'Alexandria, Egypt', lat: 31.200, lon: 29.918, zoom: 6,
    story: 'Tradition holds that Mark, writer of the second Gospel, founded the church in Alexandria, the great city of learning.',
    why: 'Egypt’s church, the Coptic Church, grew into one of the oldest churches in the world, and Alexandria taught the whole Church.',
    didYouKnow: 'The Desert Fathers of Egypt began the monastic way of life that spread through the world.', source: 'History' },
  { id: 'armenia', when: 'about AD 301', title: 'The first Christian kingdom', place: 'Armenia', today: 'Armenia', lat: 40.161, lon: 44.297, zoom: 6,
    story: 'King Tiridates III of Armenia was baptised by Gregory the Illuminator, and Armenia became the first kingdom to make the faith its own.',
    why: 'A whole nation turned to Christ, near the mountains of Ararat where the ark rested.',
    didYouKnow: 'The cathedral at Etchmiadzin, begun in 301, is counted among the oldest cathedrals in the world.', source: 'History' },
  { id: 'nicaea', when: 'AD 325', title: 'The Creed of Nicaea', place: 'Nicaea', today: 'İznik, Turkey', lat: 40.429, lon: 29.720, zoom: 7,
    story: 'Bishops from across the empire met at Nicaea and confessed that the Son is “of one substance with the Father”.',
    why: 'The Nicene Creed, said in churches to this day, set down the faith in Jesus Christ, true God and true man.',
    didYouKnow: 'The council met at the call of the emperor Constantine, who had ended the persecution of Christians in 313.', source: 'History' },
  { id: 'constantinople', when: 'AD 330', title: 'Constantinople', place: 'Constantinople (Byzantium)', today: 'Istanbul, Turkey', lat: 41.008, lon: 28.980, zoom: 7,
    story: 'Constantine dedicated a new capital on the Bosphorus. Under Justinian the great church of Hagia Sophia, “Holy Wisdom”, rose in 537.',
    why: 'For a thousand years Constantinople was the heart of Christian learning in the east; from it the faith went to the Slavs and to Russia.',
    didYouKnow: 'Hagia Sophia was the largest church in the world for nearly a thousand years.', source: 'History' },
  { id: 'axum', when: 'about AD 330', title: 'Axum believes', place: 'Axum', today: 'Aksum, Ethiopia', lat: 14.121, lon: 38.723, zoom: 6,
    story: 'King Ezana of Axum turned to Christ through Frumentius, a Syrian Christian who had grown up at his court; Frumentius became the first bishop of Ethiopia.',
    why: 'Ethiopia became one of the first Christian kingdoms, and has kept the faith for over sixteen centuries.',
    didYouKnow: 'Ezana’s coins changed from the sun and moon to the cross: among the first coins in the world to bear it.', source: 'History' },
  { id: 'carthage', when: 'about AD 400', title: 'Augustine of Africa', place: 'Hippo and Carthage', today: 'Annaba, Algeria, and Tunis', lat: 36.880, lon: 7.750, zoom: 6,
    story: 'Augustine, born in North Africa, became bishop of Hippo. His Confessions and City of God shaped Christian thought for centuries.',
    why: 'North Africa gave the Church great teachers: Tertullian, Cyprian and Augustine.',
    didYouKnow: 'Augustine was converted on reading Romans 13:13-14 after hearing a child’s voice say, “Take up and read.”', source: 'History' },
  { id: 'ireland', when: 'about AD 432', title: 'Patrick in Ireland', place: 'Ireland', today: 'Ireland', lat: 53.350, lon: -6.260, zoom: 5,
    story: 'Patrick, once a slave in Ireland, returned as a missionary and preached across the island.',
    why: 'Irish monks later carried the Gospel back into Britain and Europe.',
    didYouKnow: 'Patrick is said to have used the three-leaf shamrock to teach the Trinity.', source: 'History' },
  { id: 'kyiv', when: 'AD 988', title: 'The baptism of Kyiv', place: 'Kyiv', today: 'Kyiv, Ukraine', lat: 50.450, lon: 30.523, zoom: 5,
    story: 'Prince Vladimir was baptised and called the people of Kyiv to baptism in the river Dnieper.',
    why: 'The faith of Constantinople spread through the Slavic lands, Ukraine and Russia.',
    didYouKnow: 'Vladimir’s envoys said of the worship in Hagia Sophia: “we knew not whether we were in heaven or on earth.”', source: 'History' },
  { id: 'wittenberg', when: 'AD 1517', title: 'The Reformation', place: 'Wittenberg', today: 'Wittenberg, Germany', lat: 51.866, lon: 12.646, zoom: 6,
    story: 'Martin Luther posted 95 theses on the church door, calling the Church back to grace and to the Scriptures.',
    why: 'The Bible was translated into the languages of the people, and printing put it in ordinary hands.',
    didYouKnow: 'The King James Bible, used across Nigeria and Ghana, was published in 1611.', source: 'History' },
  { id: 'badagry', when: 'AD 1842', title: 'The Gospel at Badagry', place: 'Badagry', today: 'Badagry, Lagos State, Nigeria', lat: 6.416, lon: 2.887, zoom: 9,
    story: 'Thomas Birch Freeman of the Methodist mission landed at Badagry and held the first Christian service on Nigerian soil of the modern mission; Anglicans followed.',
    why: 'Missions from Badagry and Abeokuta carried the Gospel through Yorubaland; Samuel Ajayi Crowther, a Yoruba, became the first African Anglican bishop in 1864.',
    didYouKnow: 'Crowther led the translation of the Bible into Yoruba, completed in 1884: the root of the Bibeli Mimọ read in this app.', source: 'History' },
  { id: 'aladura', when: 'from 1918', title: 'Churches that pray', place: 'Yorubaland', today: 'south-west Nigeria', lat: 7.150, lon: 3.350, zoom: 7,
    story: 'In the influenza of 1918 and the years after, prayer groups rose in Yorubaland: the Aladura (“those who pray”) churches, rooted in prayer, healing and the Holy Spirit.',
    why: 'African Christians worshipped in their own languages and ways, with the Bible, prayer and healing at the centre.',
    didYouKnow: 'The Celestial Church of Christ is counted among the Aladura churches.', source: 'History' },
  { id: 'porto-novo', when: '29 September 1947', title: 'The Divine Order', place: 'Porto-Novo', today: 'Porto-Novo, Benin', lat: 6.497, lon: 2.605, zoom: 9,
    story: 'During prayer, a winged angel bathed in light brought God’s commission to Samuel Bilehou Joseph Oshoffa: to preach to the world, with works of divine healing in the name of Jesus Christ.',
    why: 'The Celestial Church of Christ was born, and grew from Porto-Novo to Lagos and then to every continent.',
    didYouKnow: 'The Church’s name was revealed in French: “Eglise du Christianisme Céleste”.', source: 'Constitution, clauses 1–3' },
  { id: 'imeko', when: '1985 to today', title: 'The Celestial City', place: 'Imeko', today: 'Imeko, Ogun State, Nigeria', lat: 7.443, lon: 2.857, zoom: 9,
    story: 'The Founder was buried at Imeko, his mother’s town, as he had directed. Each Christmas pilgrims gather at the Celestial City.',
    why: 'A place of pilgrimage, prayer and the Christmas convocation for Celestians from around the world.',
    didYouKnow: 'Celestial parishes now meet across Africa, Europe and the Americas: open the map of parishes to find one.', source: 'Constitution, clause 8' },
];

/** Countries of the Bible lands, their names then, and their flags (ISO code) */
export interface AncientName { iso2: string; country: string; then: string; note: string; lat: number; lon: number }

export const ANCIENT_NAMES: AncientName[] = [
  { iso2: 'IL', country: 'Israel', then: 'Galilee, Samaria, Judaea', note: 'The land of Jesus’ ministry.', lat: 31.5, lon: 34.9 },
  { iso2: 'PS', country: 'Palestine', then: 'Judaea, Samaria', note: 'Bethlehem, Jericho and Sychar.', lat: 31.9, lon: 35.25 },
  { iso2: 'JO', country: 'Jordan', then: 'Moab, Ammon, Edom, Peraea, Decapolis', note: 'Mount Nebo and Bethany beyond Jordan.', lat: 31.2, lon: 36.3 },
  { iso2: 'LB', country: 'Lebanon', then: 'Phoenicia', note: 'Tyre and Sidon.', lat: 33.9, lon: 35.85 },
  { iso2: 'SY', country: 'Syria', then: 'Aram, Syria', note: 'Damascus.', lat: 34.8, lon: 38.5 },
  { iso2: 'TR', country: 'Turkey', then: 'Asia Minor: Asia, Galatia, Cilicia, Cappadocia, Bithynia', note: 'Antioch, Ephesus, Tarsus, Nicaea, Constantinople.', lat: 39.0, lon: 34.5 },
  { iso2: 'GR', country: 'Greece', then: 'Macedonia, Achaia', note: 'Philippi, Thessalonica, Athens, Corinth, Patmos.', lat: 39.3, lon: 22.0 },
  { iso2: 'IT', country: 'Italy', then: 'Italia, Rome', note: 'Rome, Puteoli, Syracuse.', lat: 42.5, lon: 12.6 },
  { iso2: 'MT', country: 'Malta', then: 'Melita', note: 'Paul’s shipwreck.', lat: 35.9, lon: 14.4 },
  { iso2: 'CY', country: 'Cyprus', then: 'Cyprus', note: 'Salamis and Paphos; home of Barnabas.', lat: 35.0, lon: 33.2 },
  { iso2: 'EG', country: 'Egypt', then: 'Egypt, Goshen', note: 'Joseph, Moses, the holy family’s refuge.', lat: 26.8, lon: 30.8 },
  { iso2: 'IQ', country: 'Iraq', then: 'Mesopotamia, Babylon, Assyria, Chaldea', note: 'Ur, Babylon, Nineveh.', lat: 33.0, lon: 43.7 },
  { iso2: 'IR', country: 'Iran', then: 'Persia, Media, Elam', note: 'Shushan, where Esther was queen.', lat: 32.4, lon: 53.7 },
  { iso2: 'SA', country: 'Saudi Arabia', then: 'Arabia', note: 'Paul went into Arabia after his conversion (Galatians 1:17).', lat: 24.0, lon: 45.0 },
  { iso2: 'SD', country: 'Sudan', then: 'Cush, Nubia, “Ethiopia” of the Bible', note: 'The kingdom of Candace.', lat: 15.5, lon: 30.2 },
  { iso2: 'ET', country: 'Ethiopia', then: 'Axum, Abyssinia', note: 'An ancient Christian kingdom.', lat: 9.1, lon: 40.5 },
  { iso2: 'LY', country: 'Libya', then: 'Cyrenaica, Libya', note: 'Cyrene, home of Simon who carried the cross.', lat: 27.0, lon: 17.2 },
  { iso2: 'TN', country: 'Tunisia', then: 'Africa (the Roman province), Carthage', note: 'Tertullian and Cyprian.', lat: 34.0, lon: 9.5 },
  { iso2: 'AM', country: 'Armenia', then: 'Ararat, Armenia', note: 'The first Christian kingdom.', lat: 40.2, lon: 45.0 },
  { iso2: 'BJ', country: 'Benin', then: 'Dahomey', note: 'Porto-Novo: the Divine Order of 1947.', lat: 9.3, lon: 2.3 },
  { iso2: 'NG', country: 'Nigeria', then: 'Lagos and Yorubaland', note: 'Ketu, Makoko and the Celestial City, Imeko.', lat: 9.1, lon: 8.7 },
];
