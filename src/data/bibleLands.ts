/**
 * Places of the Bible with their names and countries today, for the map games.
 *
 * Coordinates are of the site, or of the traditional site where scholars differ (marked `traditional`).
 * Ancient regions are approximate first-century boundaries, after Herod the Great's kingdom was divided
 * (Luke 3:1). Modern borders come from Natural Earth and are shown for orientation only, not as a position
 * on any disputed territory (PRINCIPLES §1).
 */

export type LonLat = [number, number];

export interface BiblePlace {
  id: string;
  /** Name in the KJV */
  name: string;
  /** Other Bible names */
  aka?: string[];
  /** Name of the place or nearest town today */
  today: string;
  /** Country or territory today */
  country: string;
  lon: number;
  lat: number;
  /** What is there now */
  note: string;
  refs: string;
  /** The exact site is not known; this is the site tradition points to */
  traditional?: boolean;
  /** Which map shows it */
  map: 'holyland' | 'world';
}

const p = (id: string, name: string, today: string, country: string, lat: number, lon: number, note: string, refs: string,
           extra: Partial<BiblePlace> = {}): BiblePlace =>
  ({ id, name, today, country, lat, lon, note, refs, map: 'holyland', ...extra });

export const PLACES: BiblePlace[] = [
  // ── Galilee ──
  p('nazareth', 'Nazareth', 'Nazareth', 'Israel', 32.7019, 35.2978, 'A large Arab city; the Basilica of the Annunciation stands over the traditional home of Mary.', 'Luke 1:26; Matthew 2:23'),
  p('cana', 'Cana of Galilee', 'Kafr Kanna', 'Israel', 32.7466, 35.3389, 'A town north-east of Nazareth with “wedding churches”. Some scholars prefer Khirbet Qana, 8 km further north.', 'John 2:1-11', { traditional: true }),
  p('capernaum', 'Capernaum', 'Kfar Nahum (ruins)', 'Israel', 32.8806, 35.5753, 'Ruins on the north shore of the Sea of Galilee: a white limestone synagogue built over the one Jesus taught in, and the house of Peter.', 'Matthew 4:13; Mark 2:1'),
  p('magdala', 'Magdala', 'Migdal', 'Israel', 32.8256, 35.5150, 'Excavations by the lake revealed a first-century synagogue. Home of Mary Magdalene.', 'Matthew 15:39; Luke 8:2'),
  p('bethsaida', 'Bethsaida', 'et-Tell (ruins)', 'Israel', 32.9106, 35.6306, 'A ruin mound north of the lake. Home of Peter, Andrew and Philip; Jesus fed the five thousand near here.', 'John 1:44; Luke 9:10', { traditional: true }),
  p('chorazin', 'Chorazin', 'Korazim (ruins)', 'Israel', 32.9114, 35.5639, 'Black basalt ruins of a synagogue in the hills above Capernaum.', 'Matthew 11:21'),
  p('gergesa', 'Gergesa (country of the Gadarenes)', 'Kursi', 'Israel', 32.8261, 35.6503, 'A Byzantine monastery marks the place where the swine ran down into the lake.', 'Matthew 8:28-34; Mark 5:1', { traditional: true }),
  p('nain', 'Nain', 'Nein', 'Israel', 32.6311, 35.3486, 'A small village with a chapel recalling the raising of the widow’s son.', 'Luke 7:11-15'),
  p('tabor', 'Mount Tabor', 'Mount Tabor', 'Israel', 32.6869, 35.3906, 'The Church of the Transfiguration crowns the mountain.', 'Matthew 17:1-2; Judges 4:6', { traditional: true }),
  p('tabgha', 'Shore of the Sea of Tiberias', 'Tabgha', 'Israel', 32.8728, 35.5492, 'Churches of the Multiplication and of Peter’s Primacy, where the risen Jesus cooked breakfast for His disciples.', 'John 21:1-17', { traditional: true }),
  p('caesarea-philippi', 'Caesarea Philippi', 'Banias', 'Golan Heights', 33.2483, 35.6944, 'A nature reserve with springs and a cave shrine to Pan, at the foot of Mount Hermon.', 'Matthew 16:13-18'),
  p('tyre', 'Tyre', 'Sour (Tyre)', 'Lebanon', 33.2705, 35.1964, 'A port city with Roman ruins; Jesus healed a Syrophoenician woman’s daughter in these parts.', 'Matthew 15:21-28; Ezekiel 27'),
  p('sidon', 'Sidon', 'Saida', 'Lebanon', 33.5631, 35.3689, 'A port city with a crusader sea castle.', 'Luke 4:26; Acts 27:3'),
  p('hermon', 'Mount Hermon', 'Mount Hermon (Jabal al-Shaykh)', 'Lebanon, Syria and the Golan Heights', 33.4164, 35.8572, 'The highest mountain of the region, snow-capped in winter.', 'Psalm 133:3; Deuteronomy 3:8'),
  p('dan', 'Dan', 'Tel Dan', 'Israel', 33.2486, 35.6522, 'A nature reserve at a source of the Jordan, with the ruins of Jeroboam’s altar. “From Dan to Beersheba.”', 'Judges 20:1; 1 Kings 12:29'),
  p('megiddo', 'Megiddo', 'Tel Megiddo', 'Israel', 32.5853, 35.1847, 'A ruin mound guarding the Jezreel Valley; its Greek name is Armageddon.', '2 Kings 23:29; Revelation 16:16'),
  p('carmel', 'Mount Carmel', 'Mount Carmel (Haifa)', 'Israel', 32.6650, 35.0950, 'Muhraqa, on the ridge, marks where Elijah called down fire.', '1 Kings 18:19-39'),
  // ── Samaria ──
  p('sychar', 'Sychar (Jacob’s well)', 'Balata, Nablus', 'Palestine (West Bank)', 32.2097, 35.2853, 'An Orthodox church in Nablus holds Jacob’s well, where Jesus spoke with the woman of Samaria.', 'John 4:5-42'),
  p('shechem', 'Shechem', 'Tell Balata, Nablus', 'Palestine (West Bank)', 32.2136, 35.2817, 'Ruins beside Nablus, between Mount Gerizim and Mount Ebal.', 'Genesis 12:6; Joshua 24:1'),
  p('samaria', 'Samaria (city)', 'Sebastia', 'Palestine (West Bank)', 32.2764, 35.1956, 'A village among the ruins of the capital of the northern kingdom, rebuilt by Herod as Sebaste.', '1 Kings 16:24; Acts 8:5'),
  p('shiloh', 'Shiloh', 'Khirbet Seilun', 'Palestine (West Bank)', 32.0556, 35.2897, 'Ruins where the tabernacle stood and young Samuel served.', '1 Samuel 1:3; Joshua 18:1'),
  p('bethel', 'Bethel', 'Beitin', 'Palestine (West Bank)', 31.9283, 35.2378, 'A village near Ramallah where Jacob dreamt of the ladder.', 'Genesis 28:10-19'),
  // ── Judea ──
  p('jerusalem', 'Jerusalem', 'Jerusalem (Old City)', 'Jerusalem — status disputed', 31.7767, 35.2345, 'The walled Old City, holy to Jews, Christians and Muslims. Its status is disputed between Israel and Palestine.', 'Psalm 122; Luke 2:41-49'),
  p('temple', 'The Temple', 'Temple Mount / Haram al-Sharif', 'Jerusalem — status disputed', 31.7781, 35.2354, 'The Western Wall and the Dome of the Rock stand where Herod’s Temple stood.', 'John 2:13-17; 1 Kings 6'),
  p('golgotha', 'Golgotha (Calvary)', 'Church of the Holy Sepulchre', 'Jerusalem — status disputed', 31.7784, 35.2296, 'A church built in AD 335 over the rock of Calvary and the tomb. (Some prefer the Garden Tomb, 600 m north.)', 'John 19:17-18, 41-42', { traditional: true }),
  p('gethsemane', 'Gethsemane', 'Garden of Gethsemane', 'Jerusalem — status disputed', 31.7794, 35.2397, 'Ancient olive trees beside the Church of All Nations at the foot of the Mount of Olives.', 'Matthew 26:36-46'),
  p('olives', 'Mount of Olives', 'Mount of Olives (at-Tur)', 'Jerusalem — status disputed', 31.7783, 35.2444, 'A ridge east of the Old City, covered with churches and an ancient Jewish cemetery.', 'Matthew 21:1; Acts 1:9-12'),
  p('bethany', 'Bethany', 'al-Eizariya', 'Palestine (West Bank)', 31.7714, 35.2614, 'A town whose Arabic name remembers Lazarus; his tomb is shown there.', 'John 11:1-44; Luke 24:50'),
  p('bethlehem', 'Bethlehem', 'Bethlehem', 'Palestine (West Bank)', 31.7043, 35.2073, 'A city south of Jerusalem; the Church of the Nativity stands over the cave of Jesus’ birth.', 'Luke 2:4-7; Micah 5:2'),
  p('jericho', 'Jericho', 'Jericho (Ariha)', 'Palestine (West Bank)', 31.8711, 35.4442, 'A green oasis city near the ancient mound of Tell es-Sultan, one of the oldest towns in the world.', 'Joshua 6; Luke 19:1-10'),
  p('wilderness', 'Wilderness of Judea', 'Judean Desert', 'Palestine (West Bank)', 31.7000, 35.3500, 'Bare hills falling to the Dead Sea. The Mount of Temptation above Jericho recalls Jesus’ forty days.', 'Matthew 4:1-11', { traditional: true }),
  p('bethabara', 'Bethabara / Bethany beyond Jordan', 'Al-Maghtas', 'Jordan', 31.8372, 35.5503, 'The baptism site on the east bank of the Jordan, a World Heritage Site.', 'John 1:28; Matthew 3:13-17', { traditional: true }),
  p('emmaus', 'Emmaus', 'Emmaus Nicopolis (Imwas)', 'Israel / Palestine', 31.8394, 34.9894, 'Several villages claim to be Emmaus; this is the oldest tradition.', 'Luke 24:13-35', { traditional: true }),
  p('hebron', 'Hebron', 'Hebron (al-Khalil)', 'Palestine (West Bank)', 31.5247, 35.1106, 'The Cave of Machpelah, tomb of Abraham, Sarah, Isaac and Jacob.', 'Genesis 23:19; 2 Samuel 2:1'),
  p('beersheba', 'Beersheba', 'Be’er Sheva', 'Israel', 31.2447, 34.8406, 'A city in the Negev beside Tel Sheva, where Abraham dug a well.', 'Genesis 21:31'),
  p('joppa', 'Joppa', 'Jaffa (Tel Aviv–Yafo)', 'Israel', 32.0539, 34.7514, 'The old port of Tel Aviv, where Jonah set sail and Peter saw the vision of the sheet.', 'Jonah 1:3; Acts 10:9-16'),
  p('caesarea', 'Caesarea', 'Caesarea', 'Israel', 32.5000, 34.8917, 'Herod’s harbour city: a theatre, aqueduct and ruins by the sea. Peter baptised Cornelius here.', 'Acts 10; Acts 23:33'),
  p('gaza', 'Gaza', 'Gaza', 'Palestine (Gaza Strip)', 31.5017, 34.4668, 'A coastal city; Samson carried away its gates. On the road to Gaza Philip met the Ethiopian.', 'Judges 16:1-3; Acts 8:26'),
  p('ashdod', 'Ashdod (Azotus)', 'Ashdod', 'Israel', 31.7542, 34.6611, 'A port city; the Philistines brought the ark to the temple of Dagon here.', '1 Samuel 5:1; Acts 8:40'),
  p('masada', 'The strongholds of the wilderness (Masada)', 'Masada', 'Israel', 31.3156, 35.3536, 'Herod’s fortress on a rock above the Dead Sea; David hid in strongholds like it.', '1 Samuel 23:29', { traditional: true }),
  // ── East of the Jordan ──
  p('gadara', 'Gadara', 'Umm Qais', 'Jordan', 32.6556, 35.6797, 'Ruins of a Decapolis city with a view over the Sea of Galilee.', 'Matthew 8:28'),
  p('nebo', 'Mount Nebo', 'Mount Nebo', 'Jordan', 31.7681, 35.7256, 'A hilltop church where Moses looked over the Promised Land before he died.', 'Deuteronomy 34:1-5'),
  p('rabbah', 'Rabbah of the Ammonites', 'Amman', 'Jordan', 31.9539, 35.9106, 'The capital of Jordan; Uriah fell at its walls.', '2 Samuel 11:1; 12:26'),
  p('machaerus', 'Machaerus', 'Mukawir', 'Jordan', 31.5681, 35.6233, 'Herod’s hilltop fortress where, by tradition, John the Baptist was beheaded.', 'Mark 6:17-29', { traditional: true }),
  p('petra', 'Sela (Edom)', 'Petra', 'Jordan', 30.3285, 35.4444, 'The rock-cut city of the Nabataeans, in the land of Edom.', '2 Kings 14:7; Obadiah 1:3', { traditional: true }),
  // ── Egypt and Sinai ──
  p('egypt-flight', 'Egypt (the flight of the holy family)', 'Matariya, Cairo', 'Egypt', 30.1300, 31.3100, 'Coptic tradition traces the holy family across Egypt; in Matariya stands the old “Virgin’s Tree”.', 'Matthew 2:13-15', { traditional: true }),
  p('goshen', 'Goshen', 'Eastern Nile Delta (Sharqia)', 'Egypt', 30.7300, 31.8000, 'Farmland in the eastern Delta where Jacob’s family settled.', 'Genesis 47:27; Exodus 8:22', { traditional: true }),
  p('memphis', 'Noph (Memphis)', 'Mit Rahina, near Giza', 'Egypt', 29.8447, 31.2503, 'Ruins and colossal statues of the old capital of Egypt, near the pyramids.', 'Jeremiah 46:19; Hosea 9:6'),
  p('on', 'On (Heliopolis)', 'Al-Matariya, Cairo', 'Egypt', 30.1294, 31.3075, 'An obelisk remains of the city of the sun-god. Joseph married the daughter of its priest.', 'Genesis 41:45'),
  p('sinai', 'Mount Sinai (Horeb)', 'Jebel Musa', 'Egypt', 28.5392, 33.9750, 'St Catherine’s Monastery, one of the oldest in the world, lies at its foot.', 'Exodus 19:20; 1 Kings 19:8', { traditional: true }),
  p('kadesh', 'Kadesh-barnea', 'Ein el-Qudeirat', 'Egypt', 30.6547, 34.4222, 'A spring oasis in north Sinai where Israel camped for many years.', 'Numbers 13:26; 20:1', { traditional: true }),
  p('ezion-geber', 'Ezion-geber', 'near Eilat and Aqaba', 'Israel / Jordan', 29.5500, 34.9800, 'At the head of the Gulf of Aqaba, where Solomon built his ships.', '1 Kings 9:26', { traditional: true }),
  // ── The wider Bible world ──
  p('ur', 'Ur of the Chaldees', 'Tell el-Muqayyar', 'Iraq', 30.9625, 46.1031, 'Desert ruins with a great ziggurat. Abraham set out from here.', 'Genesis 11:31', { map: 'world' }),
  p('haran', 'Haran', 'Harran', 'Turkey', 36.8644, 39.0317, 'A village of beehive houses beside the ruins where Abraham’s father died.', 'Genesis 11:31-12:4', { map: 'world' }),
  p('babylon', 'Babylon', 'Babil, near Hillah', 'Iraq', 32.5364, 44.4208, 'Ruins on the Euphrates where Daniel served and the exiles wept.', 'Daniel 1:1; Psalm 137:1', { map: 'world' }),
  p('nineveh', 'Nineveh', 'Mosul', 'Iraq', 36.3594, 43.1528, 'Ruins across the Tigris from Mosul; the tomb of Jonah was here.', 'Jonah 3:3', { map: 'world' }),
  p('shushan', 'Shushan (Susa)', 'Shush', 'Iran', 32.1894, 48.2575, 'Palace ruins of the Persian kings, where Esther became queen.', 'Esther 1:2; Nehemiah 1:1', { map: 'world' }),
  p('damascus', 'Damascus', 'Damascus', 'Syria', 33.5114, 36.3064, 'The capital of Syria. “The street which is called Straight” still runs through the old city.', 'Acts 9:1-19', { map: 'world' }),
  p('antioch', 'Antioch in Syria', 'Antakya', 'Turkey', 36.2025, 36.1606, 'Here the disciples were first called Christians; the cave church of St Peter remains.', 'Acts 11:26; 13:1-3', { map: 'world' }),
  p('tarsus', 'Tarsus', 'Tarsus', 'Turkey', 36.9178, 34.8928, 'Paul’s birthplace, a city near the coast of southern Turkey.', 'Acts 21:39; 22:3', { map: 'world' }),
  p('ephesus', 'Ephesus', 'near Selçuk', 'Turkey', 37.9411, 27.3419, 'Magnificent ruins: the theatre where the crowd shouted “Great is Diana”.', 'Acts 19; Ephesians 1:1', { map: 'world' }),
  p('patmos', 'Patmos', 'Patmos', 'Greece', 37.3100, 26.5500, 'A Greek island; the Cave of the Apocalypse is shown where John received the Revelation.', 'Revelation 1:9', { map: 'world' }),
  p('philippi', 'Philippi', 'near Krinides', 'Greece', 41.0128, 24.2864, 'Ruins in Macedonia where Lydia believed and the jailer was baptised.', 'Acts 16:12-40', { map: 'world' }),
  p('athens', 'Athens', 'Athens', 'Greece', 37.9715, 23.7257, 'The capital of Greece. Paul preached on the Areopagus, below the Acropolis.', 'Acts 17:16-34', { map: 'world' }),
  p('corinth', 'Corinth', 'Ancient Corinth', 'Greece', 37.9058, 22.8789, 'Ruins with the bema, the judgment seat where Paul stood before Gallio.', 'Acts 18:1-17', { map: 'world' }),
  p('rome', 'Rome', 'Rome', 'Italy', 41.8925, 12.4853, 'The capital of Italy, where Paul lived two years under guard and wrote letters.', 'Acts 28:16-31; Romans 1:7', { map: 'world' }),
  p('melita', 'Melita', 'Malta', 'Malta', 35.9500, 14.4100, 'St Paul’s Bay recalls the shipwreck.', 'Acts 28:1-10', { map: 'world' }),
  p('paphos', 'Paphos (Cyprus)', 'Paphos', 'Cyprus', 34.7550, 32.4067, 'Ruins and St Paul’s Pillar, where the proconsul believed.', 'Acts 13:6-12', { map: 'world' }),
  // ── The journeys of Paul and the churches he wrote to ──
  p('seleucia', 'Seleucia', 'Çevlik, near Samandağ', 'Turkey', 36.1233, 35.9222, 'The silted harbour of Antioch, with a great rock-cut water tunnel. Paul and Barnabas sailed from here.', 'Acts 13:4', { map: 'world' }),
  p('salamis', 'Salamis', 'near Famagusta', 'Cyprus (north)', 35.1847, 33.9006, 'Wide Roman ruins by the sea; Barnabas, a Cypriot, is remembered at a monastery nearby.', 'Acts 13:5', { map: 'world' }),
  p('perga', 'Perga in Pamphylia', 'Aksu, near Antalya', 'Turkey', 36.9614, 30.8539, 'Ruins with a long colonnaded street. Here John Mark left Paul and Barnabas.', 'Acts 13:13; 14:25', { map: 'world' }),
  p('attalia', 'Attalia', 'Antalya', 'Turkey', 36.8847, 30.7040, 'A large resort city on the Mediterranean; its old harbour is still in use.', 'Acts 14:25-26', { map: 'world' }),
  p('pisidian-antioch', 'Antioch in Pisidia', 'near Yalvaç', 'Turkey', 38.3058, 31.1894, 'Hilltop ruins where Paul preached in the synagogue and turned to the Gentiles.', 'Acts 13:14-52', { map: 'world' }),
  p('iconium', 'Iconium', 'Konya', 'Turkey', 37.8714, 32.4846, 'A large city on the Anatolian plateau.', 'Acts 14:1-6', { map: 'world' }),
  p('lystra', 'Lystra', 'near Hatunsaray', 'Turkey', 37.5783, 32.4522, 'An unexcavated mound. A lame man was healed, and Paul was stoned. Timothy came from here.', 'Acts 14:8-20; 16:1', { map: 'world' }),
  p('derbe', 'Derbe', 'Kerti Höyük, near Karaman', 'Turkey', 37.3833, 33.5167, 'A ruin mound; Paul made many disciples here before turning back.', 'Acts 14:20-21', { map: 'world', traditional: true }),
  p('troas', 'Troas', 'Alexandria Troas (ruins), near Dalyan', 'Turkey', 39.7522, 26.1589, 'Ruins on the Aegean. Paul saw the vision of the man of Macedonia, and Eutychus fell from a window.', 'Acts 16:8-10; 20:6-12', { map: 'world' }),
  p('neapolis', 'Neapolis', 'Kavala', 'Greece', 40.9369, 24.4122, 'A harbour town, Paul’s first landing in Europe.', 'Acts 16:11', { map: 'world' }),
  p('thessalonica', 'Thessalonica', 'Thessaloniki', 'Greece', 40.6401, 22.9444, 'Greece’s second city; the Roman forum and the Arch of Galerius remain.', 'Acts 17:1-9; 1 Thessalonians 1:1', { map: 'world' }),
  p('berea', 'Berea', 'Veria', 'Greece', 40.5236, 22.2025, 'A town in Macedonia whose Jews “searched the scriptures daily”; a monument marks Paul’s preaching.', 'Acts 17:10-12', { map: 'world' }),
  p('cenchreae', 'Cenchrea', 'Kechries', 'Greece', 37.8844, 22.9925, 'Sunken harbour ruins of Corinth. Phebe served the church here.', 'Acts 18:18; Romans 16:1', { map: 'world' }),
  p('miletus', 'Miletus', 'near Balat', 'Turkey', 37.5303, 27.2783, 'Ruins with a great theatre, once a harbour. Paul said farewell to the Ephesian elders here.', 'Acts 20:15-38', { map: 'world' }),
  p('myra', 'Myra in Lycia', 'Demre', 'Turkey', 36.2589, 29.9850, 'Rock-cut tombs and the church of St Nicholas. Paul changed ships here on the way to Rome.', 'Acts 27:5-6', { map: 'world' }),
  p('fair-havens', 'The Fair Havens', 'Kali Limenes', 'Greece (Crete)', 34.9300, 24.8100, 'A small bay on the south coast of Crete.', 'Acts 27:8', { map: 'world' }),
  p('syracuse', 'Syracuse', 'Syracuse', 'Italy (Sicily)', 37.0755, 15.2866, 'A city in Sicily; Paul stayed three days.', 'Acts 28:12', { map: 'world' }),
  p('rhegium', 'Rhegium', 'Reggio Calabria', 'Italy', 38.1113, 15.6473, 'A city at the toe of Italy.', 'Acts 28:13', { map: 'world' }),
  p('puteoli', 'Puteoli', 'Pozzuoli, near Naples', 'Italy', 40.8228, 14.1222, 'A port town; brethren met Paul here and he stayed seven days.', 'Acts 28:13-14', { map: 'world' }),
  p('galatia', 'Galatia', 'central Turkey (around Ankara)', 'Turkey', 39.9334, 32.8597, 'A Roman province, not a city: Paul wrote “unto the churches of Galatia”, such as Iconium, Lystra and Derbe.', 'Galatians 1:2', { map: 'world' }),
  p('colossae', 'Colosse', 'unexcavated mound near Honaz', 'Turkey', 37.7883, 29.2569, 'A mound in the Lycus valley. Philemon and Epaphras belonged to this church.', 'Colossians 1:2; Philemon 1:2', { map: 'world' }),
  p('laodicea', 'Laodicea', 'near Denizli', 'Turkey', 37.8358, 29.1075, 'Large restored ruins. Paul mentions a letter to it; Revelation calls it lukewarm.', 'Colossians 4:16; Revelation 3:14-22', { map: 'world' }),
  p('crete', 'Crete', 'Gortyn, Crete', 'Greece', 35.0614, 24.9472, 'Ruins of the Roman capital of Crete, where Titus was left to ordain elders.', 'Titus 1:5', { map: 'world' }),
  p('ararat', 'The mountains of Ararat', 'Mount Ararat (Ağrı Dağı)', 'Turkey', 39.7019, 44.2983, 'A snow-capped volcano near the borders of Turkey, Armenia and Iran.', 'Genesis 8:4', { map: 'world', traditional: true }),
  p('thebes', 'No (Thebes)', 'Luxor', 'Egypt', 25.6872, 32.6396, 'The temples of Karnak and Luxor on the Nile.', 'Jeremiah 46:25; Nahum 3:8', { map: 'world' }),
  p('cyrene', 'Cyrene', 'Shahat', 'Libya', 32.8250, 21.8581, 'Greek ruins in Libya. Simon of Cyrene carried Jesus’ cross.', 'Mark 15:21; Acts 2:10', { map: 'world' }),
];

export const placeById = (id: string) => PLACES.find(pl => pl.id === id);

// ── The journey of Jesus, in order ─────────────────────────────

export interface JourneyStop { placeId: string; prompt: string; ref: string }

export const JESUS_JOURNEY: JourneyStop[] = [
  { placeId: 'bethlehem', prompt: 'Where was Jesus born?', ref: 'Luke 2:4-7' },
  { placeId: 'temple', prompt: 'Where was the baby Jesus presented to the Lord, and Simeon took Him in his arms?', ref: 'Luke 2:22-32' },
  { placeId: 'egypt-flight', prompt: 'Where did Joseph take Mary and the child to escape Herod?', ref: 'Matthew 2:13-15' },
  { placeId: 'nazareth', prompt: 'In which town did Jesus grow up?', ref: 'Matthew 2:23; Luke 2:51-52' },
  { placeId: 'temple', prompt: 'Aged twelve, where was Jesus found, “about my Father’s business”?', ref: 'Luke 2:41-49' },
  { placeId: 'bethabara', prompt: 'Where was Jesus baptised by John?', ref: 'John 1:28; Matthew 3:13-17' },
  { placeId: 'wilderness', prompt: 'Where was Jesus tempted for forty days?', ref: 'Matthew 4:1-11' },
  { placeId: 'cana', prompt: 'Where did Jesus turn water into wine?', ref: 'John 2:1-11' },
  { placeId: 'capernaum', prompt: 'Which lakeside town became Jesus’ home, “his own city”?', ref: 'Matthew 4:13; 9:1' },
  { placeId: 'sychar', prompt: 'Where did Jesus meet the woman of Samaria at a well?', ref: 'John 4:5-42' },
  { placeId: 'nain', prompt: 'Where did Jesus raise a widow’s only son?', ref: 'Luke 7:11-15' },
  { placeId: 'bethsaida', prompt: 'Near which town did Jesus feed the five thousand?', ref: 'Luke 9:10-17' },
  { placeId: 'gergesa', prompt: 'Where did Jesus cast the legion of devils into the swine?', ref: 'Matthew 8:28-34' },
  { placeId: 'tyre', prompt: 'In the coasts of which city did Jesus heal the daughter of a Syrophoenician woman?', ref: 'Mark 7:24-30' },
  { placeId: 'caesarea-philippi', prompt: 'Where did Peter say, “Thou art the Christ, the Son of the living God”?', ref: 'Matthew 16:13-18' },
  { placeId: 'tabor', prompt: 'On which mountain, by tradition, was Jesus transfigured?', ref: 'Matthew 17:1-2' },
  { placeId: 'jericho', prompt: 'Where did Zacchaeus climb a sycomore tree to see Jesus?', ref: 'Luke 19:1-10' },
  { placeId: 'bethany', prompt: 'Where did Jesus raise Lazarus from the dead?', ref: 'John 11:1-44' },
  { placeId: 'olives', prompt: 'From which hill did Jesus ride into Jerusalem on a colt?', ref: 'Luke 19:29-38' },
  { placeId: 'gethsemane', prompt: 'Where did Jesus pray, “not my will, but thine, be done”, and was arrested?', ref: 'Matthew 26:36-50; Luke 22:42' },
  { placeId: 'golgotha', prompt: 'Where was Jesus crucified, died and was laid in a new tomb?', ref: 'John 19:17-42' },
  { placeId: 'emmaus', prompt: 'On the road to which village did the risen Jesus walk with two disciples?', ref: 'Luke 24:13-35' },
  { placeId: 'tabgha', prompt: 'Where did the risen Jesus cook breakfast and tell Peter, “Feed my sheep”?', ref: 'John 21:1-17' },
  { placeId: 'olives', prompt: 'From where did Jesus ascend into heaven?', ref: 'Acts 1:9-12; Luke 24:50-51' },
];

// ── The journeys of Paul, in order (Acts 9–28) ────────────────

export interface PaulStop extends JourneyStop { journey: 'conversion' | 'first' | 'second' | 'third' | 'rome' }

export const PAUL_JOURNEY: PaulStop[] = [
  { journey: 'conversion', placeId: 'damascus', prompt: 'On the road to which city did Saul see the light and hear Jesus?', ref: 'Acts 9:1-19' },
  { journey: 'conversion', placeId: 'tarsus', prompt: 'To which city, his birthplace, was Saul sent away for safety?', ref: 'Acts 9:30; 22:3' },
  { journey: 'conversion', placeId: 'antioch', prompt: 'Where did Barnabas bring Saul to teach, and the disciples were first called Christians?', ref: 'Acts 11:25-26' },
  { journey: 'first', placeId: 'salamis', prompt: 'First journey: in which city of Cyprus did they first preach?', ref: 'Acts 13:4-5' },
  { journey: 'first', placeId: 'paphos', prompt: 'Where was Elymas the sorcerer struck blind and the deputy believed?', ref: 'Acts 13:6-12' },
  { journey: 'first', placeId: 'pisidian-antioch', prompt: 'Where did Paul say, “lo, we turn to the Gentiles”?', ref: 'Acts 13:14-46' },
  { journey: 'first', placeId: 'iconium', prompt: 'From which city did they flee when an assault was made to stone them?', ref: 'Acts 14:1-6' },
  { journey: 'first', placeId: 'lystra', prompt: 'Where did the people call Barnabas Jupiter and Paul Mercurius?', ref: 'Acts 14:8-19' },
  { journey: 'first', placeId: 'derbe', prompt: 'Which was the farthest city of the first journey?', ref: 'Acts 14:20-21' },
  { journey: 'second', placeId: 'troas', prompt: 'Second journey: where did Paul see the vision, “Come over into Macedonia”?', ref: 'Acts 16:8-10' },
  { journey: 'second', placeId: 'philippi', prompt: 'Where was Lydia baptised, and the jailer believed after the earthquake?', ref: 'Acts 16:12-34' },
  { journey: 'second', placeId: 'thessalonica', prompt: 'Where did Jason’s house shelter Paul, and a church begin that he later wrote to twice?', ref: 'Acts 17:1-9' },
  { journey: 'second', placeId: 'berea', prompt: 'Whose people “received the word with all readiness of mind”?', ref: 'Acts 17:10-12' },
  { journey: 'second', placeId: 'athens', prompt: 'Where did Paul preach about the altar “TO THE UNKNOWN GOD”?', ref: 'Acts 17:16-34' },
  { journey: 'second', placeId: 'corinth', prompt: 'Where did Paul make tents with Aquila and Priscilla for eighteen months?', ref: 'Acts 18:1-11' },
  { journey: 'third', placeId: 'ephesus', prompt: 'Third journey: where did Paul teach for two years, until the riot for Diana?', ref: 'Acts 19:1-41' },
  { journey: 'third', placeId: 'miletus', prompt: 'Where did Paul say farewell to the elders of Ephesus on the shore?', ref: 'Acts 20:17-38' },
  { journey: 'third', placeId: 'jerusalem', prompt: 'Where was Paul arrested in the Temple?', ref: 'Acts 21:27-33' },
  { journey: 'rome', placeId: 'caesarea', prompt: 'Where was Paul kept two years, and appealed unto Caesar?', ref: 'Acts 24:27; 25:11' },
  { journey: 'rome', placeId: 'myra', prompt: 'At which port of Lycia did they change to a ship of Alexandria?', ref: 'Acts 27:5-6' },
  { journey: 'rome', placeId: 'fair-havens', prompt: 'At which bay of Crete did Paul warn them not to sail on?', ref: 'Acts 27:8-10' },
  { journey: 'rome', placeId: 'melita', prompt: 'On which island were they shipwrecked, and a viper fastened on Paul’s hand?', ref: 'Acts 28:1-6' },
  { journey: 'rome', placeId: 'puteoli', prompt: 'At which Italian port did brethren meet Paul?', ref: 'Acts 28:13-14' },
  { journey: 'rome', placeId: 'rome', prompt: 'Where did Paul live two years in his own hired house, preaching the kingdom of God?', ref: 'Acts 28:30-31' },
];

export const PAUL_JOURNEY_NAMES: Record<PaulStop['journey'], string> = {
  conversion: 'Conversion', first: 'First journey', second: 'Second journey', third: 'Third journey', rome: 'Voyage to Rome',
};

// ── The churches and people Paul wrote to ─────────────────────

export interface PaulLetter { letter: string; to: string; placeId: string; from: string; when: string; ref: string }

export const PAUL_LETTERS: PaulLetter[] = [
  { letter: 'Romans', to: 'all that be in Rome, beloved of God', placeId: 'rome', from: 'Corinth', when: 'about AD 57', ref: 'Romans 1:7' },
  { letter: '1 Corinthians', to: 'the church of God which is at Corinth', placeId: 'corinth', from: 'Ephesus', when: 'about AD 55', ref: '1 Corinthians 1:2' },
  { letter: '2 Corinthians', to: 'the church of God which is at Corinth, with all the saints in Achaia', placeId: 'corinth', from: 'Macedonia', when: 'about AD 56', ref: '2 Corinthians 1:1' },
  { letter: 'Galatians', to: 'the churches of Galatia', placeId: 'galatia', from: 'Antioch or Ephesus (uncertain)', when: 'about AD 49–55', ref: 'Galatians 1:2' },
  { letter: 'Ephesians', to: 'the saints which are at Ephesus', placeId: 'ephesus', from: 'prison, probably Rome', when: 'about AD 60–62', ref: 'Ephesians 1:1' },
  { letter: 'Philippians', to: 'all the saints in Christ Jesus which are at Philippi', placeId: 'philippi', from: 'prison, probably Rome', when: 'about AD 61', ref: 'Philippians 1:1' },
  { letter: 'Colossians', to: 'the saints and faithful brethren in Christ which are at Colosse', placeId: 'colossae', from: 'prison, probably Rome', when: 'about AD 60–62', ref: 'Colossians 1:2' },
  { letter: '1 Thessalonians', to: 'the church of the Thessalonians', placeId: 'thessalonica', from: 'Corinth', when: 'about AD 50–51, among the first letters', ref: '1 Thessalonians 1:1' },
  { letter: '2 Thessalonians', to: 'the church of the Thessalonians', placeId: 'thessalonica', from: 'Corinth', when: 'about AD 51', ref: '2 Thessalonians 1:1' },
  { letter: '1 Timothy', to: 'Timothy, left at Ephesus', placeId: 'ephesus', from: 'Macedonia', when: 'about AD 62–64', ref: '1 Timothy 1:2-3' },
  { letter: '2 Timothy', to: 'Timothy, probably still at Ephesus', placeId: 'ephesus', from: 'prison in Rome, Paul’s last letter', when: 'about AD 64–67', ref: '2 Timothy 1:2; 4:6' },
  { letter: 'Titus', to: 'Titus, left in Crete', placeId: 'crete', from: 'Macedonia or Nicopolis', when: 'about AD 63', ref: 'Titus 1:4-5' },
  { letter: 'Philemon', to: 'Philemon, and the church in his house at Colosse', placeId: 'colossae', from: 'prison, probably Rome', when: 'about AD 60–62', ref: 'Philemon 1:1-2' },
];

// ── Regions in the time of Jesus (approximate) ────────────────

export interface AncientRegion { id: string; name: string; latin?: string; ruler: string; ring: LonLat[]; label: LonLat }

export const NT_REGIONS: AncientRegion[] = [
  { id: 'galilee', name: 'Galilee', latin: 'Galilaea', ruler: 'Herod Antipas (Luke 3:1)', label: [35.33, 32.80],
    ring: [[35.10, 32.85], [35.30, 32.95], [35.40, 33.20], [35.55, 33.12], [35.62, 32.90], [35.56, 32.70], [35.55, 32.60], [35.40, 32.52], [35.20, 32.58], [35.08, 32.70]] },
  { id: 'samaria', name: 'Samaria', latin: 'Samaria', ruler: 'Roman prefect of Judaea', label: [35.22, 32.28],
    ring: [[34.95, 32.45], [35.20, 32.58], [35.40, 32.52], [35.55, 32.42], [35.55, 32.05], [35.30, 32.00], [35.05, 32.05], [34.88, 32.25]] },
  { id: 'judea', name: 'Judea', latin: 'Iudaea', ruler: 'Pontius Pilate, governor (Luke 3:1)', label: [35.12, 31.68],
    ring: [[34.85, 32.00], [35.05, 32.05], [35.30, 32.00], [35.55, 32.05], [35.55, 31.80], [35.45, 31.40], [35.30, 31.25], [35.00, 31.30], [34.80, 31.45], [34.70, 31.70]] },
  { id: 'idumea', name: 'Idumea', latin: 'Idumaea', ruler: 'Roman prefect of Judaea', label: [35.00, 31.12],
    ring: [[34.60, 31.35], [34.80, 31.45], [35.00, 31.30], [35.30, 31.25], [35.45, 31.40], [35.40, 31.00], [35.10, 30.85], [34.75, 30.95], [34.55, 31.15]] },
  { id: 'perea', name: 'Perea', latin: 'Peraea', ruler: 'Herod Antipas', label: [35.70, 31.95],
    ring: [[35.57, 32.40], [35.75, 32.38], [35.85, 32.10], [35.80, 31.70], [35.70, 31.45], [35.58, 31.45], [35.55, 31.80], [35.55, 32.05]] },
  { id: 'decapolis', name: 'Decapolis', latin: 'Decapolis', ruler: 'Ten free Greek cities (Mark 5:20)', label: [36.00, 32.52],
    ring: [[35.50, 32.58], [35.65, 32.75], [35.70, 32.95], [35.95, 32.95], [36.30, 32.80], [36.40, 32.40], [36.10, 32.10], [35.85, 32.10], [35.75, 32.38], [35.57, 32.42]] },
  { id: 'iturea', name: 'Iturea & Trachonitis', latin: 'Ituraea', ruler: 'Philip the tetrarch (Luke 3:1)', label: [36.05, 33.15],
    ring: [[35.62, 32.90], [35.70, 32.95], [35.95, 32.95], [36.30, 32.80], [36.55, 33.00], [36.40, 33.40], [35.95, 33.55], [35.65, 33.30], [35.55, 33.12]] },
  { id: 'phoenicia', name: 'Phoenicia', latin: 'Phoenice', ruler: 'Province of Syria', label: [35.30, 33.40],
    ring: [[35.08, 32.92], [35.30, 32.95], [35.40, 33.20], [35.62, 33.70], [35.75, 33.90], [35.48, 33.90], [35.20, 33.40], [35.10, 33.10]] },
  { id: 'nabatea', name: 'Nabatea (Arabia)', latin: 'Arabia Nabataea', ruler: 'King Aretas (2 Corinthians 11:32)', label: [36.10, 30.60],
    ring: [[35.70, 31.45], [35.80, 31.70], [36.40, 31.80], [37.00, 31.50], [37.00, 29.40], [35.00, 29.40], [34.90, 29.60], [35.10, 30.85], [35.40, 31.00], [35.45, 31.40], [35.58, 31.45]] },
];

/** Labels drawn on the old-style map */
export const OLD_MAP_LABELS: { name: string; at: LonLat; kind: 'sea' | 'land' | 'desert' }[] = [
  { name: 'The Great Sea', at: [33.6, 32.6], kind: 'sea' },
  { name: 'Sea of Galilee', at: [35.80, 32.90], kind: 'sea' },
  { name: 'Salt Sea', at: [35.85, 31.40], kind: 'sea' },
  { name: 'Egypt', at: [31.6, 29.6], kind: 'land' },
  { name: 'Wilderness of Sinai', at: [33.6, 29.0], kind: 'desert' },
  { name: 'Wilderness of Paran', at: [34.2, 30.2], kind: 'desert' },
  { name: 'Syria', at: [36.6, 33.7], kind: 'land' },
  { name: 'River of Egypt', at: [33.5, 30.9], kind: 'desert' },
];

// ── Bible lands and the countries they are in today ────────────

export interface BibleLand { name: string; aka: string; countries: string[]; answer: string; refs: string; note: string }

export const BIBLE_LANDS: BibleLand[] = [
  { name: 'Egypt', aka: 'Mizraim, the land of Ham', countries: ['EGY'], answer: 'Egypt', refs: 'Genesis 12:10; Matthew 2:13', note: 'Israel’s house of bondage, and a refuge for the holy family.' },
  { name: 'Ethiopia (Cush)', aka: 'the kingdom of Candace', countries: ['SDN'], answer: 'Sudan', refs: 'Acts 8:27; Psalm 68:31', note: 'Biblical “Ethiopia” was Cush, the Nile kingdom of Meroë — today northern Sudan.' },
  { name: 'Babylon (Chaldea)', aka: 'the land of Shinar', countries: ['IRQ'], answer: 'Iraq', refs: 'Genesis 11:2; Daniel 1:1', note: 'Between the Tigris and Euphrates, south of Baghdad.' },
  { name: 'Assyria', aka: 'Asshur, with Nineveh', countries: ['IRQ'], answer: 'Iraq', refs: '2 Kings 17:6; Jonah 1:2', note: 'Northern Iraq, around Mosul (Nineveh).' },
  { name: 'Persia and Media', aka: 'Elam, Shushan the palace', countries: ['IRN'], answer: 'Iran', refs: 'Esther 1:3; Daniel 5:28', note: 'Cyrus king of Persia let the Jews return home (Ezra 1).' },
  { name: 'Aram (Syria)', aka: 'Damascus, Aram-naharaim', countries: ['SYR'], answer: 'Syria', refs: '2 Kings 5:1; Acts 9:2', note: 'Naaman the Syrian came from here; Saul met Jesus on the Damascus road.' },
  { name: 'Phoenicia', aka: 'Tyre and Sidon, Lebanon', countries: ['LBN'], answer: 'Lebanon', refs: '1 Kings 5:6; Mark 7:24', note: 'Hiram of Tyre sent cedars of Lebanon for the Temple.' },
  { name: 'Moab, Ammon and Edom', aka: 'Gilead, Bashan, Mount Seir', countries: ['JOR'], answer: 'Jordan', refs: 'Ruth 1:1; Numbers 21:13', note: 'Ruth came from Moab; Moses died on Mount Nebo.' },
  { name: 'Asia Minor', aka: 'Galatia, Cappadocia, Asia, Lycia', countries: ['TUR'], answer: 'Turkey', refs: 'Acts 2:9; 1 Peter 1:1', note: 'Paul’s letters to the Galatians and Ephesians, and the seven churches of Revelation.' },
  { name: 'Macedonia and Achaia', aka: 'Philippi, Thessalonica, Corinth', countries: ['GRC'], answer: 'Greece', refs: 'Acts 16:9; Romans 15:26', note: '“Come over into Macedonia, and help us.”' },
  { name: 'Chittim (Cyprus)', aka: 'the isle of Barnabas', countries: ['CYP', 'CYN'], answer: 'Cyprus', refs: 'Acts 4:36; 13:4', note: 'Barnabas was from Cyprus; Paul’s first journey began here.' },
  { name: 'Italy', aka: 'Rome', countries: ['ITA'], answer: 'Italy', refs: 'Acts 27:1; Romans 1:7', note: 'Paul was taken to Rome to appear before Caesar.' },
  { name: 'Libya (Put)', aka: 'the parts of Libya about Cyrene', countries: ['LBY'], answer: 'Libya', refs: 'Acts 2:10; Ezekiel 30:5', note: 'People from Cyrene heard Peter at Pentecost.' },
  { name: 'Sheba', aka: 'the land of the queen of the south', countries: ['YEM', 'ETH', 'ERI'], answer: 'Yemen (Ethiopian tradition also claims her)', refs: '1 Kings 10:1; Matthew 12:42', note: 'Saba was in Yemen; Ethiopian tradition remembers the queen as Makeda.' },
  { name: 'Arabia', aka: 'Kedar, Dedan, Tema', countries: ['SAU', 'JOR'], answer: 'Saudi Arabia and Jordan', refs: 'Galatians 1:17; Isaiah 21:13', note: 'Paul went into Arabia after his conversion.' },
  { name: 'Ararat', aka: 'the kingdom of Urartu', countries: ['TUR', 'ARM'], answer: 'Turkey and Armenia', refs: 'Genesis 8:4; Jeremiah 51:27', note: 'The ark rested “upon the mountains of Ararat”.' },
  { name: 'Melita', aka: 'the island of the shipwreck', countries: ['MLT'], answer: 'Malta', refs: 'Acts 28:1', note: 'The islanders “shewed us no little kindness”.' },
  { name: 'Canaan', aka: 'the Promised Land, Israel and Judah', countries: ['ISR', 'PSX'], answer: 'Israel and Palestine', refs: 'Genesis 12:5-7; Joshua 1:2-4', note: 'The land promised to Abraham, between the Jordan and the Great Sea.' },
];

/** Great-circle distance in km */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** 100 points on target, falling to 0 at `zeroAt` km */
export function distanceScore(km: number, zeroAt = 60): number {
  if (km <= 3) return 100;
  return Math.max(0, Math.round(100 * (1 - Math.log1p(km - 3) / Math.log1p(zeroAt - 3))));
}
