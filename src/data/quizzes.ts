/**
 * Quiz question banks. Each question carries an explanation and its source, so a
 * wrong answer teaches something. Bible answers follow the KJV; Church answers follow
 * the 1980 Constitution of the Celestial Church of Christ (Nigeria Diocese).
 * The hymn quiz is generated from the hymnal itself (see utils/quiz.ts).
 */

export type QuizTopic = 'bible' | 'hymns' | 'constitution' | 'geography' | 'doctrine';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  /** Index of the correct option */
  answer: number;
  explanation: string;
  /** Bible reference ("John 3:16") or a source label ("Constitution, clause 93") */
  source: string;
  difficulty: 1 | 2 | 3;
}

export const QUIZ_TOPICS: Record<QuizTopic, { title: string; description: string; icon: string }> = {
  bible: { title: 'Bible', description: 'People, events and teachings of the Old and New Testaments', icon: '📖' },
  geography: { title: 'Bible lands & history', description: 'Places, journeys and history of the Bible', icon: '🗺️' },
  doctrine: { title: 'Celestial faith & practice', description: 'Tenets, rites and worship of the Celestial Church', icon: '🕊️' },
  constitution: { title: 'The Constitution', description: 'How the Church is founded, led and organised', icon: '📜' },
  hymns: { title: 'Hymns', description: 'First lines, numbers and sections of the hymnal', icon: '🎵' },
};

const q = (id: string, question: string, options: string[], answer: number, explanation: string, source: string, difficulty: 1 | 2 | 3 = 1): QuizQuestion =>
  ({ id, question, options, answer, explanation, source, difficulty });

export const QUESTION_BANKS: Record<Exclude<QuizTopic, 'hymns'>, QuizQuestion[]> = {
  bible: [
    q('b1', 'How many books are in the Bible (Protestant canon)?', ['66', '72', '39', '27'], 0, '39 books in the Old Testament and 27 in the New Testament.', 'The Bible'),
    q('b2', 'Who was swallowed by a great fish?', ['Jonah', 'Elijah', 'Jeremiah', 'Peter'], 0, 'Jonah fled from God’s call to Nineveh and was swallowed by a great fish for three days and nights.', 'Jonah 1:17'),
    q('b3', 'What was the first miracle of Jesus recorded in John’s Gospel?', ['Turning water into wine', 'Walking on water', 'Feeding the five thousand', 'Raising Lazarus'], 0, 'At a wedding in Cana of Galilee Jesus turned water into wine: “this beginning of miracles”.', 'John 2:1-11'),
    q('b4', 'Who led the Israelites out of Egypt?', ['Moses', 'Joshua', 'Aaron', 'Abraham'], 0, 'God called Moses from the burning bush to bring His people out of Egypt.', 'Exodus 3:10'),
    q('b5', 'Who betrayed Jesus for thirty pieces of silver?', ['Judas Iscariot', 'Peter', 'Thomas', 'Barabbas'], 0, 'Judas covenanted with the chief priests for thirty pieces of silver.', 'Matthew 26:14-15'),
    q('b6', 'Which disciple denied Jesus three times?', ['Peter', 'John', 'James', 'Andrew'], 0, 'Before the cock crew, Peter denied Jesus three times, as Jesus had foretold.', 'Matthew 26:69-75'),
    q('b7', 'What did God create on the first day?', ['Light', 'Dry land', 'The sun and moon', 'Man'], 0, '“And God said, Let there be light: and there was light.”', 'Genesis 1:3-5'),
    q('b8', 'Who killed Goliath?', ['David', 'Saul', 'Jonathan', 'Samson'], 0, 'David the shepherd boy struck Goliath with a stone from his sling.', '1 Samuel 17:49'),
    q('b9', 'How many days and nights did it rain during the flood?', ['Forty', 'Seven', 'Twelve', 'One hundred and fifty'], 0, '“The rain was upon the earth forty days and forty nights.”', 'Genesis 7:12'),
    q('b10', 'Who was thrown into the den of lions?', ['Daniel', 'Shadrach', 'Joseph', 'Elisha'], 0, 'Daniel kept praying to God despite the king’s decree, and God shut the lions’ mouths.', 'Daniel 6:16-22'),
    q('b11', 'What are the first words of Psalm 23?', ['The LORD is my shepherd', 'Blessed is the man', 'Make a joyful noise', 'The earth is the LORD’s'], 0, '“The LORD is my shepherd; I shall not want.”', 'Psalm 23:1'),
    q('b12', 'Who was the mother of Samuel?', ['Hannah', 'Sarah', 'Rachel', 'Ruth'], 0, 'Hannah prayed for a son and dedicated Samuel to the LORD.', '1 Samuel 1:20'),
    q('b13', 'Which prophet was taken up to heaven in a whirlwind?', ['Elijah', 'Elisha', 'Isaiah', 'Enoch'], 0, 'A chariot of fire appeared, “and Elijah went up by a whirlwind into heaven.”', '2 Kings 2:11'),
    q('b14', 'How many disciples did Jesus choose?', ['Twelve', 'Seven', 'Seventy', 'Ten'], 0, 'Jesus ordained twelve to be with Him and to preach.', 'Mark 3:14'),
    q('b15', 'What is the shortest verse in the KJV Bible?', ['“Jesus wept.”', '“Pray without ceasing.”', '“Rejoice evermore.”', '“God is love.”'], 0, 'At the grave of Lazarus, “Jesus wept.”', 'John 11:35', 2),
    q('b16', 'Who wrote most of the New Testament letters (epistles)?', ['Paul', 'Peter', 'John', 'James'], 0, 'Thirteen letters, from Romans to Philemon, carry Paul’s name.', 'Romans 1:1', 2),
    q('b17', 'What did the Holy Spirit appear as at Jesus’ baptism?', ['A dove', 'Tongues of fire', 'A cloud', 'A rushing wind'], 0, 'The Spirit of God descended “like a dove, and lighting upon him.”', 'Matthew 3:16'),
    q('b18', 'On which day did the Holy Spirit come upon the disciples in Jerusalem?', ['The day of Pentecost', 'The Passover', 'The Day of Atonement', 'The Feast of Tabernacles'], 0, '“When the day of Pentecost was fully come… they were all filled with the Holy Ghost.”', 'Acts 2:1-4'),
    q('b19', 'Which is the “first commandment with promise”?', ['Honour thy father and mother', 'Thou shalt not kill', 'Remember the sabbath day', 'Thou shalt not steal'], 0, '“Honour thy father and mother; which is the first commandment with promise.”', 'Ephesians 6:2', 2),
    q('b20', 'Who was the first king of Israel?', ['Saul', 'David', 'Solomon', 'Samuel'], 0, 'Samuel anointed Saul as the first king over Israel.', '1 Samuel 10:1'),
    q('b21', 'What did Solomon ask God for?', ['An understanding heart (wisdom)', 'Riches', 'Long life', 'Victory over his enemies'], 0, 'Solomon asked for “an understanding heart to judge thy people”, and God also gave him riches and honour.', '1 Kings 3:9-13'),
    q('b22', 'Which book comes directly after the four Gospels?', ['Acts', 'Romans', 'Revelation', 'Hebrews'], 0, 'The Acts of the Apostles follows Matthew, Mark, Luke and John.', 'The Bible'),
    q('b23', 'Who was the oldest man recorded in the Bible?', ['Methuselah', 'Noah', 'Adam', 'Enoch'], 0, '“All the days of Methuselah were nine hundred sixty and nine years.”', 'Genesis 5:27', 2),
    q('b24', 'Fill in: “For God so loved the world, that he gave his only begotten ___.”', ['Son', 'Word', 'Spirit', 'Lamb'], 0, '“…that whosoever believeth in him should not perish, but have everlasting life.”', 'John 3:16'),
    q('b25', 'Which fruit of the Spirit is listed first in Galatians 5?', ['Love', 'Joy', 'Peace', 'Faith'], 0, '“The fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, meekness, temperance.”', 'Galatians 5:22-23', 2),
    q('b26', 'Who was sold into Egypt by his brothers?', ['Joseph', 'Benjamin', 'Reuben', 'Moses'], 0, 'Joseph’s brothers sold him to Ishmeelites for twenty pieces of silver.', 'Genesis 37:28'),
    q('b27', 'Whose wife looked back and became a pillar of salt?', ['Lot’s', 'Abraham’s', 'Noah’s', 'Isaac’s'], 0, 'Fleeing Sodom, Lot’s wife looked back and became a pillar of salt.', 'Genesis 19:26'),
    q('b28', 'How many loaves fed the five thousand?', ['Five', 'Seven', 'Two', 'Twelve'], 0, 'Five loaves and two fishes; twelve baskets of fragments were left over.', 'Matthew 14:17-20'),
    q('b29', 'Who was the tax collector who climbed a sycamore tree to see Jesus?', ['Zacchaeus', 'Matthew', 'Nicodemus', 'Bartimaeus'], 0, 'Zacchaeus, little of stature, climbed up into a sycamore tree.', 'Luke 19:2-4'),
    q('b30', 'Which book of the Bible tells of the new heaven and new earth?', ['Revelation', 'Daniel', 'Genesis', 'Hebrews'], 0, '“And I saw a new heaven and a new earth.”', 'Revelation 21:1'),
  ],

  geography: [
    q('g1', 'Where was Jesus born?', ['Bethlehem of Judaea', 'Nazareth', 'Jerusalem', 'Capernaum'], 0, '“Jesus was born in Bethlehem of Judaea in the days of Herod the king.”', 'Matthew 2:1'),
    q('g2', 'In which river was Jesus baptised?', ['The Jordan', 'The Nile', 'The Euphrates', 'The Kidron'], 0, 'Jesus came from Nazareth and was baptised of John in Jordan.', 'Mark 1:9'),
    q('g3', 'Where did Moses receive the Ten Commandments?', ['Mount Sinai', 'Mount Carmel', 'Mount Zion', 'Mount Nebo'], 0, 'The LORD came down upon mount Sinai and gave the law.', 'Exodus 19:20; 20:1-17'),
    q('g4', 'To which city was Jonah sent to preach?', ['Nineveh', 'Babylon', 'Tarshish', 'Damascus'], 0, '“Arise, go to Nineveh, that great city, and cry against it.” Jonah first fled toward Tarshish.', 'Jonah 1:2-3'),
    q('g5', 'On the road to which city was Saul (Paul) converted?', ['Damascus', 'Jerusalem', 'Antioch', 'Tarsus'], 0, 'As he came near Damascus, a light from heaven shone round about him.', 'Acts 9:3'),
    q('g6', 'Where did Noah’s ark come to rest?', ['The mountains of Ararat', 'Mount Sinai', 'Mount Moriah', 'Mount Hermon'], 0, '“The ark rested… upon the mountains of Ararat.”', 'Genesis 8:4'),
    q('g7', 'Where were the disciples first called Christians?', ['Antioch', 'Jerusalem', 'Rome', 'Corinth'], 0, '“The disciples were called Christians first in Antioch.”', 'Acts 11:26'),
    q('g8', 'Where did Jesus perform His first miracle?', ['Cana of Galilee', 'Bethany', 'Jericho', 'Capernaum'], 0, 'At a marriage in Cana of Galilee He turned water into wine.', 'John 2:1-11'),
    q('g9', 'Which city’s walls fell after Israel marched around it?', ['Jericho', 'Ai', 'Jerusalem', 'Gaza'], 0, 'After seven days of marching and a great shout, the wall fell down flat.', 'Joshua 6:20'),
    q('g10', 'On which island was John when he received the Revelation?', ['Patmos', 'Crete', 'Cyprus', 'Malta'], 0, '“I John… was in the isle that is called Patmos.”', 'Revelation 1:9'),
    q('g11', 'Where did Elijah challenge the prophets of Baal?', ['Mount Carmel', 'Mount Horeb', 'Mount Gilboa', 'Mount of Olives'], 0, 'Ahab gathered the prophets of Baal unto mount Carmel.', '1 Kings 18:19-39'),
    q('g12', 'What does “Golgotha” mean?', ['The place of a skull', 'The garden of olives', 'House of bread', 'City of David'], 0, 'Jesus went forth to “a place called the place of a skull, which is called in the Hebrew Golgotha.”', 'John 19:17'),
    q('g13', 'From which city did Abram set out with his father Terah?', ['Ur of the Chaldees', 'Haran', 'Babylon', 'Hebron'], 0, 'Terah took Abram and went forth from Ur of the Chaldees.', 'Genesis 11:31', 2),
    q('g14', 'In which town did Jesus grow up?', ['Nazareth', 'Bethlehem', 'Bethany', 'Jericho'], 0, 'They returned into Galilee, to their own city Nazareth.', 'Luke 2:39'),
    q('g15', 'Which sea did the Israelites cross on dry ground when leaving Egypt?', ['The Red Sea', 'The Dead Sea', 'The Sea of Galilee', 'The Great Sea'], 0, 'The LORD caused the sea to go back, and Israel went through on dry ground.', 'Exodus 14:21-22; 15:4'),
    q('g16', 'Where did Jesus raise Lazarus from the dead?', ['Bethany', 'Nain', 'Capernaum', 'Bethsaida'], 0, 'Lazarus was “of Bethany, the town of Mary and her sister Martha.”', 'John 11:1, 43-44'),
    q('g17', 'In which garden did Jesus pray before His arrest?', ['Gethsemane', 'Eden', 'The garden tomb', 'The king’s garden'], 0, 'Jesus came with His disciples to a place called Gethsemane.', 'Matthew 26:36'),
    q('g18', 'To which empire were the people of Judah carried away captive?', ['Babylon', 'Egypt', 'Rome', 'Greece'], 0, 'Nebuchadnezzar king of Babylon carried Judah away captive.', '2 Kings 24:14-16; 25:11', 2),
    q('g19', 'In which city was Paul and Silas’s jailer converted after an earthquake?', ['Philippi', 'Thessalonica', 'Ephesus', 'Athens'], 0, 'At midnight Paul and Silas prayed and sang praises; the jailer and his house believed.', 'Acts 16:12, 25-34', 2),
    q('g20', 'Near which town was Jacob’s well, where Jesus met the woman of Samaria?', ['Sychar', 'Shiloh', 'Bethel', 'Hebron'], 0, '“Then cometh he to a city of Samaria, which is called Sychar… Now Jacob’s well was there.”', 'John 4:5-6', 3),
    q('g21', 'From which mountain did Moses see the promised land before he died?', ['Mount Nebo', 'Mount Sinai', 'Mount Carmel', 'Mount Tabor'], 0, 'Moses went up from the plains of Moab unto the mountain of Nebo.', 'Deuteronomy 34:1', 2),
    q('g22', 'In which city did the Holy Spirit fall at Pentecost?', ['Jerusalem', 'Antioch', 'Galilee', 'Joppa'], 0, 'The disciples had been told to tarry in Jerusalem until they were endued with power.', 'Luke 24:49; Acts 2:1-5'),
    q('g23', 'Which lake was Peter fishing on when Jesus called him?', ['The Sea of Galilee', 'The Dead Sea', 'The Red Sea', 'Lake Merom'], 0, 'Jesus, walking by the sea of Galilee, saw Simon called Peter casting a net.', 'Matthew 4:18'),
    q('g24', 'Who rebuilt the walls of Jerusalem after the exile?', ['Nehemiah', 'Ezra', 'Zerubbabel', 'Daniel'], 0, 'Nehemiah led the people, and “the wall was finished… in fifty and two days.”', 'Nehemiah 6:15', 2),
    q('g25', 'Where was the Celestial Church of Christ founded?', ['Porto-Novo, Dahomey (now Benin)', 'Lagos, Nigeria', 'Imeko, Nigeria', 'Cotonou, Benin'], 0, 'The Church came into the world by Divine Order on 29 September 1947 in Porto-Novo.', 'Constitution, clause 1'),
  ],

  doctrine: [
    q('d1', 'On what date did the Celestial Church of Christ come into the world by Divine Order?', ['29 September 1947', '23 May 1947', '29 March 1980', '24 November 1958'], 0, 'During prayer, the winged angel brought God’s word to the Founder on 29 September 1947.', 'Constitution, clauses 1–2'),
    q('d2', 'Who is the Pastor Founder of the Church?', ['Rev. Samuel Bilehou Joseph Oshoffa', 'Alexander Abiodun Adebayo Bada', 'Moses Ajovi', 'Alexander Yanga'], 0, 'The Church came into the world “through a single individual”, the Reverend Pastor Prophet Founder S. B. J. Oshoffa.', 'Constitution, clause 1'),
    q('d3', 'Through whom was the name of the Church revealed?', ['Alexander Yanga, after seven days in trance', 'The Founder, in the forest', 'A prophetess using oranges', 'Moses Ajovi in Lagos'], 0, 'At the end of the seventh day in trance, Alexander Yanga wrote “Eglise du Christianisme Celeste” on the wall.', 'Constitution, clause 3', 2),
    q('d4', 'What does “Ijo Mimo ti Kristi lati orun wa” mean?', ['Celestial Church of Christ', 'Church of the Holy Spirit', 'Church of the Cherubim', 'Christ Apostolic Church'], 0, 'It is the Yoruba name of the Celestial Church of Christ.', 'Constitution, clause 92'),
    q('d5', 'According to the tenets, which of these is forbidden to members?', ['Alcohol and tobacco', 'Fasting', 'Reading the Bible at home', 'Singing in other languages'], 0, 'Tenets 2 and 3 forbid tobacco and any intoxicating drink, “repugnant to the presence of the Holy Spirit.”', 'Constitution, clause 93'),
    q('d6', 'Which food is forbidden by the tenets?', ['Pork and food offered to idols', 'Beef', 'Fish', 'Yam'], 0, 'Tenet 4 forbids pork and any food offered as sacrifice to idols or other powers of darkness.', 'Constitution, clause 93(4)'),
    q('d7', 'What colour of candle may be used in the Church?', ['White only', 'Any colour', 'Red and white', 'Blue and white'], 0, '“Only white candles are to be used. Coloured candles are strictly forbidden.”', 'Constitution, clause 93(10)'),
    q('d8', 'Why do Celestians remove their shoes in church?', ['The tenets forbid shoes with the sutana or in the church premises', 'To keep the church clean only', 'It is a local custom in some parishes', 'Only on feast days'], 0, 'Members should not wear shoes when wearing their sutana or within the premises of the Church (compare Exodus 3:5).', 'Constitution, clause 93(6)'),
    q('d9', 'How is baptism performed in the Celestial Church of Christ?', ['By immersion', 'By sprinkling', 'By anointing with oil', 'By laying on of hands only'], 0, 'Baptism is by immersion; one must be baptised or re-baptised into the faith (Acts 19:1-6).', 'Constitution, clause 99(a)'),
    q('d10', 'When is the annual washing of feet held?', ['On the Thursday of Holy Week', 'On Christmas Eve', 'On the first Friday of July', 'On New Year’s Day'], 0, 'It commemorates Jesus washing His disciples’ feet at the Last Supper (John 13:5-9).', 'Constitution, clause 99(c)'),
    q('d11', 'When is Holy Mary’s Day kept?', ['The first Friday of July', '15 August', '25 March', 'The last Sunday of May'], 0, 'It commemorates the appearance of Holy Mary to the Pastor on 15 July 1977, first observed on 7 July 1978.', 'Constitution, clause 99(g)', 2),
    q('d12', 'On which Sunday is the Juvenile Harvest celebrated?', ['The first Sunday in June', 'The first Sunday in October', 'The first Sunday in August', 'Easter Sunday'], 0, 'All parishes celebrate the Juvenile Harvest on the first Sunday in June.', 'Constitution, clause 99(f)', 2),
    q('d13', 'Which direction must the altar of a Celestial church face?', ['East', 'West', 'North', 'Towards Porto-Novo'], 0, 'The altar area shall be rectangular and shall face EAST.', 'Constitution, clause 177', 2),
    q('d14', 'Who may perform anointment in the Church?', ['Only the Pastor, usually at Christmas/New Year', 'Any elder', 'Any shepherd', 'Any prophet or prophetess'], 0, 'The ceremony of anointment is performed only by the Pastor, usually once a year during the Christmas/New Year period.', 'Constitution, clause 198', 3),
    q('d15', 'What must a new member renounce?', ['Secret cults, idols and fetish, and conflicting titles such as chieftaincy', 'Their former church friends', 'Their family name', 'All worldly work'], 0, 'Clause 103 lists secret cults, idols and fetish, the works of darkness, and titles that conflict with these injunctions.', 'Constitution, clause 103'),
    q('d16', 'How long after childbirth before a woman returns to the precincts of the Church?', ['Forty-one days', 'Seven days', 'Three months', 'Twelve days'], 0, 'Female members come back after forty-one days, when they come to Church for thanksgiving.', 'Constitution, clause 193', 2),
    q('d17', 'What do all members do with the holy water at the church door?', ['Dip their hands and make the sign of the cross', 'Wash their feet', 'Drink a little', 'Nothing, it is for the altar only'], 0, 'On entering, members dip their hands in the holy water by the door and make the sign of the cross.', 'Constitution, clause 194'),
    q('d18', 'What is the vision of the Celestial Church of Christ?', ['To evangelize the world through the proclamation of the Word', 'To build schools in every town', 'To unite all African churches', 'To publish the hymn book'], 0, 'The Church’s published vision is to evangelize the world through the proclamation of the Word.', 'celestialchurch.com'),
    q('d19', 'In the Divine Order of 1947, what were the works that would testify that God sent the Founder?', ['Miraculous works of divine healing in the name of Jesus Christ', 'Great buildings', 'Many hymns', 'Wealth and influence'], 0, '“Miraculous works of Holy divine healing will be carried out by you in the name of Jesus Christ.”', 'Constitution, clause 2', 2),
    q('d20', 'Where should a Celestian’s sermon be taken from?', ['The Bible texts appointed for the day', 'Newspaper headlines', 'Any book the elder chooses', 'Political events'], 0, 'Strict adherence to the appointed text is “an overriding principle”; politics and newspapers are forbidden.', 'Constitution, clause 98'),
  ],

  constitution: [
    q('c1', 'In what year was the revised Constitution of the Nigeria Diocese promulgated?', ['1980', '1947', '1958', '1985'], 0, 'Drafting began on 29 February 1976 and the new Constitution was promulgated on 29 March 1980.', 'Constitution, foreword'),
    q('c2', 'Where does the 1980 Constitution place the Supreme Headquarters of the Church?', ['Porto-Novo, Republic of Benin', 'Ketu, Lagos', 'Makoko, Lagos', 'Imeko, Ogun State'], 0, 'Porto-Novo is both the Supreme Headquarters and the birthplace of the Church.', 'Constitution, clause 107(a)'),
    q('c3', 'Where is the International Headquarters named in the 1980 Constitution?', ['Mission House, Ketu, Lagos', 'Porto-Novo', 'Imeko', 'Abeokuta'], 0, 'The International Headquarters of the Church world-wide is at the Mission House, Ketu, Lagos State.', 'Constitution, clause 107(a)'),
    q('c4', 'What is the address of the National (Diocesan) Headquarters in the Constitution?', ['12/15 Church Street, Makoko, Yaba, Lagos', 'Mission House, Ketu', 'Celestial City, Imeko', 'Broad Street, Lagos'], 0, 'The Diocese has its National (Diocesan) Headquarters at 12/15 Church Street, Makoko, Yaba.', 'Constitution, clause 107(b)', 2),
    q('c5', 'What title is exclusive to Rev. S. B. J. Oshoffa?', ['“Pastor and Founder”', '“Pastor”', '“Supreme Evangelist”', '“Shepherd”'], 0, 'There can be only one Founder; any future head is called simply “The Pastor”.', 'Constitution, clause 110'),
    q('c6', 'According to clause 111, from which rank can the successor to the Pastor come?', ['From any rank in the hierarchy', 'Only from the Supreme Evangelists', 'Only from the Board of Trustees', 'Only from the Founder’s family'], 0, 'The successor can be from any rank and shall be named at a time chosen by God to reveal this to the incumbent Pastor.', 'Constitution, clause 111(i)', 2),
    q('c7', 'Where does clause 6 say the Pastor’s successor should have his headquarters?', ['In the land set aside for the Pastor in Porto-Novo', 'At Ketu, Lagos', 'At Imeko', 'Wherever the Pastor-in-Council decides'], 0, '“Whoever is chosen to succeed as Pastor should have his Headquarters in the land set aside for the Pastor in Porto Novo.”', 'Constitution, clause 6', 3),
    q('c8', 'Where did the Founder direct that he be buried if he died in Nigeria?', ['Imeko, near his mother', 'Makoko, Lagos', 'Ketu, Lagos', 'Ibadan'], 0, 'If he died in Nigeria he was to be buried in Imeko in Egbado Division of Ogun State, on family land near his mother.', 'Constitution, clause 8', 2),
    q('c9', 'Who is in charge of a parish on behalf of the Pastor?', ['The Pastor’s Representative', 'The Board of Trustees', 'The choir master', 'The parish treasurer'], 0, 'There is a Representative of the Pastor in each parish, an Elder or Leader or other rank in charge.', 'Constitution, clause 112'),
    q('c10', 'What body governs the Nigeria Diocese under the Pastor’s ultimate authority?', ['The Pastor-in-Council', 'The General Assembly', 'The Synod', 'The Parochial Committee'], 0, 'The overall machinery for government is vested in the Pastor-in-Council.', 'Constitution, clause 156'),
    q('c11', 'How many members does the Board of Trustees have?', ['Seven', 'Twelve', 'Five', 'Three'], 0, 'Members of the Board of Trustees are SEVEN in number.', 'Constitution, clause 200', 3),
    q('c12', 'Who may alter the provisions of the Constitution?', ['The Pastor, by himself or on the recommendation of the Pastor-in-Council', 'Any parish committee', 'A majority of members', 'The Federal Government'], 0, 'The Pastor may revoke, alter or add to any provision, by himself or on the Council’s recommendation.', 'Constitution, clause 184', 2),
    q('c13', 'In whose name must all Church property be registered?', ['The Celestial Church of Christ', 'The Pastor’s Representative', 'The parish founder', 'The Board of Trustees members personally'], 0, 'All property belongs to the Church, not to any individual or group, and is registered in its name.', 'Constitution, clause 180'),
    q('c14', 'What are the highest ranks normally reached by promotion, below Assistant Evangelist?', ['Superior Senior Leader, Superior Senior Wolider and Superior Senior Elder', 'Senior Evangelist and Supreme Evangelist', 'Pastor and Founder', 'Shepherd and Visioner'], 0, 'Promotion to Assistant Evangelist and above is not automatic.', 'Constitution, clause 186', 3),
    q('c15', 'Who interprets the doctrinal standards and the Constitution?', ['The Pastor-in-Council, under the Pastor’s ultimate authority', 'Each Diocese separately', 'The courts', 'The Parochial Committee'], 0, 'The Pastor-in-Council is responsible for interpretation, under the ultimate authority of the Pastor.', 'Constitution, clause 183', 2),
    q('c16', 'Which committee in each parish can apply discipline in minor cases?', ['The Parochial Committee', 'The choir committee', 'The harvest committee', 'The youth fellowship'], 0, 'The Parochial Committee of each parish may apply disciplinary measures in minor cases; sterner action is reported upwards.', 'Constitution, clauses 169–170', 2),
    q('c17', 'When was the Church incorporated in Nigeria?', ['24 November 1958', '29 September 1947', '1951', '29 March 1980'], 0, 'The Church was incorporated in Nigeria under the Land (Perpetual Succession) Ordinance on 24 November 1958.', 'Constitution, Deed of Constitution', 3),
    q('c18', 'Who announces items during devotional services?', ['The Parish Secretary', 'The choir leader', 'Any member', 'The Pastor’s Representative only'], 0, 'Announcements during devotional services are made by the Parish Secretary.', 'Constitution, clause 97', 2),
  ],
};
