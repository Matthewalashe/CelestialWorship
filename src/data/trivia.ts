/**
 * Trivia (true or false) and "Did you know?" cards. Each carries where to read more.
 * Bible facts follow the KJV; Church facts the 1980 Constitution; history standard references.
 */

export interface TriviaItem { id: string; statement: string; answer: boolean; explain: string; source: string }
export interface Fact { id: string; title: string; fact: string; source: string; topic: 'bible' | 'church' | 'history' | 'places' }

export const TRIVIA: TriviaItem[] = [
  { id: 't1', statement: 'The word “Trinity” appears in the Bible.', answer: false, explain: 'The word is not in the Bible, but the teaching is: Jesus sends His disciples to baptise “in the name of the Father, and of the Son, and of the Holy Ghost”.', source: 'Matthew 28:19' },
  { id: 't2', statement: 'The Book of Esther never names God.', answer: true, explain: 'Esther does not mention God by name, yet His care for His people runs through the whole story.', source: 'Esther 4:14' },
  { id: 't3', statement: 'Jesus was born in Nazareth.', answer: false, explain: 'Jesus was born in Bethlehem of Judaea and grew up in Nazareth of Galilee.', source: 'Matthew 2:1; Luke 2:39' },
  { id: 't4', statement: 'Psalm 119 is the longest chapter in the Bible.', answer: true, explain: 'It has 176 verses, arranged in 22 sections, one for each letter of the Hebrew alphabet.', source: 'Psalm 119' },
  { id: 't5', statement: 'Noah took only two of every kind of animal into the ark.', answer: false, explain: 'Clean beasts and birds went in by sevens; other beasts by two.', source: 'Genesis 7:2-3' },
  { id: 't6', statement: 'Paul wrote some of his letters from prison.', answer: true, explain: 'Ephesians, Philippians, Colossians and Philemon are called the prison letters.', source: 'Philippians 1:13; Ephesians 3:1' },
  { id: 't7', statement: 'The disciples were first called Christians in Jerusalem.', answer: false, explain: 'It was in Antioch, in Syria.', source: 'Acts 11:26' },
  { id: 't8', statement: 'Moses’ brother was Aaron, the first high priest.', answer: true, explain: 'Aaron spoke for Moses before Pharaoh and was anointed high priest.', source: 'Exodus 4:14; 28:1' },
  { id: 't9', statement: 'The Celestial Church of Christ was founded in Lagos.', answer: false, explain: 'It came into the world by Divine Order in Porto-Novo, Dahomey (now Benin), on 29 September 1947; it reached Lagos later.', source: 'Constitution, clause 1' },
  { id: 't10', statement: 'In the Celestial Church only white candles may be used.', answer: true, explain: 'Coloured candles are strictly forbidden by the tenets.', source: 'Constitution, clause 93(10)' },
  { id: 't11', statement: 'Jonah was swallowed by a whale, according to the Book of Jonah.', answer: false, explain: 'Jonah says “a great fish”; the word “whale” appears in Jesus’ words in the KJV of Matthew 12:40.', source: 'Jonah 1:17' },
  { id: 't12', statement: 'Luke wrote both the Gospel of Luke and the Acts of the Apostles.', answer: true, explain: 'Both are addressed to Theophilus, and Acts begins by referring to “the former treatise”.', source: 'Luke 1:3; Acts 1:1' },
  { id: 't13', statement: 'Methuselah lived more than 1,000 years.', answer: false, explain: 'He lived 969 years, the longest life recorded in the Bible.', source: 'Genesis 5:27' },
  { id: 't14', statement: 'The altar of a Celestial church faces east.', answer: true, explain: 'The altar area is rectangular, faces east and is set apart by a hand-rail.', source: 'Constitution, clause 177' },
  { id: 't15', statement: 'There are twelve tribes of Israel, named after the sons of Jacob.', answer: true, explain: 'Jacob, renamed Israel, had twelve sons; Joseph’s portion went to his two sons Ephraim and Manasseh.', source: 'Genesis 49:28' },
  { id: 't16', statement: 'The Sea of Galilee is a sea of salt water.', answer: false, explain: 'It is a freshwater lake, fed by the Jordan, where Peter and Andrew fished.', source: 'Matthew 4:18' },
  { id: 't17', statement: 'David was the youngest of Jesse’s sons.', answer: true, explain: 'He was keeping the sheep when Samuel came to anoint a king.', source: '1 Samuel 16:11' },
  { id: 't18', statement: 'The Bible was first written in English.', answer: false, explain: 'The Old Testament was written in Hebrew (with some Aramaic) and the New Testament in Greek.', source: 'The Bible' },
  { id: 't19', statement: 'Holy Mary’s Day is kept on the first Friday of July.', answer: true, explain: 'It remembers the appearance of Holy Mary to the Pastor on 15 July 1977.', source: 'Constitution, clause 99(g)' },
  { id: 't20', statement: 'Jesus fed the five thousand with seven loaves.', answer: false, explain: 'Five loaves and two fishes fed the five thousand; seven loaves fed the four thousand.', source: 'Matthew 14:17; 15:34' },
  { id: 't21', statement: 'The Ethiopian official was baptised by Philip on the road to Gaza.', answer: true, explain: 'He was treasurer to Candace, queen of the Ethiopians, and went on his way rejoicing.', source: 'Acts 8:26-39' },
  { id: 't22', statement: 'Constantinople was founded as a Christian capital by the emperor Constantine.', answer: true, explain: 'Constantine dedicated the city in AD 330 on the site of Byzantium. It is Istanbul today.', source: 'History' },
  { id: 't23', statement: 'A woman may lead the congregation in worship in the Celestial Church.', answer: false, explain: 'The Constitution forbids female members to enter the altar area or lead the congregation in worship.', source: 'Constitution, clause 93' },
  { id: 't24', statement: 'Simon of Cyrene, who carried Jesus’ cross, came from Africa.', answer: true, explain: 'Cyrene was a city on the coast of today’s Libya.', source: 'Mark 15:21' },
  { id: 't25', statement: 'The Book of Revelation was written on the island of Crete.', answer: false, explain: 'John received it on Patmos, a small Greek island in the Aegean.', source: 'Revelation 1:9' },
];

export const FACTS: Fact[] = [
  { id: 'f1', topic: 'bible', title: 'The book of praises', fact: 'Psalms is the longest book of the Bible: 150 psalms, the prayer book of Israel and of the Church. The Order of Service reads them with the holy names.', source: 'Psalm 150:6' },
  { id: 'f2', topic: 'places', title: 'The lowest place on land', fact: 'The shore of the Dead Sea lies about 430 metres below sea level. Its water is so salty that people float.', source: 'Genesis 14:3' },
  { id: 'f3', topic: 'history', title: 'Africa’s first convert', fact: 'The Ethiopian treasurer baptised by Philip is often counted the first African to believe in Christ; the faith reached Ethiopia’s kingdom of Axum in the 300s.', source: 'Acts 8:27-39' },
  { id: 'f4', topic: 'church', title: 'A name from heaven', fact: 'The Church’s name was revealed in French to Alexander Yanga after seven days in trance: “Eglise du Christianisme Céleste”.', source: 'Constitution, clause 3' },
  { id: 'f5', topic: 'church', title: 'Seats drawn with oranges', fact: 'The seating arrangement of the church was revealed to a prophetess in the wilderness, who sketched it with oranges on 5 October 1947.', source: 'Constitution, clause 94' },
  { id: 'f6', topic: 'history', title: 'The first Christian nation', fact: 'Armenia, near Mount Ararat, became the first kingdom to adopt Christianity, around AD 301.', source: 'History' },
  { id: 'f7', topic: 'places', title: 'A street from Acts', fact: '“The street which is called Straight”, where Paul stayed after his conversion, still runs through old Damascus.', source: 'Acts 9:11' },
  { id: 'f8', topic: 'bible', title: 'The shortest book', fact: '3 John is the shortest book of the Bible by word count: a short, warm letter to Gaius.', source: '3 John' },
  { id: 'f9', topic: 'history', title: 'The creed at Nicaea', fact: 'In AD 325 bishops met at Nicaea (İznik, Turkey) and set down the Nicene Creed, still said in churches today.', source: 'History' },
  { id: 'f10', topic: 'church', title: 'The Celestial City', fact: 'The Founder is buried at Imeko, Ogun State. The Celestial City there draws great crowds for the Christmas convocation.', source: 'Constitution, clause 8' },
  { id: 'f11', topic: 'places', title: 'Bethlehem, house of bread', fact: 'Bethlehem means “house of bread”. Jesus, born there, called Himself “the bread of life”.', source: 'John 6:35' },
  { id: 'f12', topic: 'history', title: 'The Gospel at Badagry', fact: 'Methodist missionaries landed at Badagry in 1842: the beginning of the modern Christian mission in Nigeria. Porto-Novo lies just along the coast.', source: 'History' },
  { id: 'f13', topic: 'bible', title: 'Seven “I am” sayings', fact: 'In John, Jesus says: I am the bread of life, the light of the world, the door, the good shepherd, the resurrection and the life, the way the truth and the life, the true vine.', source: 'John 6:35; 8:12; 10:9, 11; 11:25; 14:6; 15:1' },
  { id: 'f14', topic: 'church', title: 'Barefoot on holy ground', fact: 'Celestians worship barefoot, as God told Moses at the burning bush: “the place whereon thou standest is holy ground.”', source: 'Exodus 3:5' },
  { id: 'f15', topic: 'places', title: 'Paul’s shipwreck island', fact: 'Melita, where Paul was shipwrecked, is Malta. St Paul’s Bay on its north coast remembers the landing.', source: 'Acts 28:1' },
  { id: 'f16', topic: 'history', title: 'Hagia Sophia', fact: 'The great church of Hagia Sophia, “Holy Wisdom”, was finished in Constantinople in AD 537 and was the largest church in the world for nearly a thousand years.', source: 'History' },
];
