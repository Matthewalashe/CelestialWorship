"""
Bible Stories for Children — original retellings for CelestialWorship.

Short, numbered, in Bible order; each speaks to the child, keeps the words of the KJV where it quotes
God or Jesus, and ends with questions and the passage to read with a parent. Written for this app;
free to use within it. `img` names the Bible chapter the picture comes from (Sweet Publishing, CC BY-SA).
"""

def s(title, ref, img, paragraphs, questions):
    return {'title': title, 'ref': ref, 'img': img, 'paragraphs': paragraphs, 'questions': questions}

STORIES = [
  # ── In the beginning ──
  s('God Makes Everything', 'Genesis 1', ('Genesis', 1), [
    'Long, long ago there was no sun and no moon. There were no trees, no birds and no people. There was only God. Then God began to make things.',
    'First God said, “Let there be light,” and there was light. Then He made the sky, and the dry land, and the sea. He made grass and trees, and flowers of every colour.',
    'God put the sun in the sky to shine by day, and the moon and the stars to shine by night. He filled the sea with fish and the sky with birds. He made lions and lambs, elephants and tiny ants.',
    'Last of all, God made a man and a woman. He made them to be His friends and to look after everything He had made. God looked at all of it, and it was very good.',
    'When you look at the sky, or a flower, or a little bird, what does it tell you about God?',
  ], ['Who made the sun, the moon and the stars?', 'What did God make last of all?', 'What did God say about everything He had made?']),

  s('A Beautiful Garden', 'Genesis 2', ('Genesis', 2), [
    'God made a beautiful garden called Eden. Clear rivers ran through it, and trees grew there full of good fruit to eat.',
    'God took some dust from the ground and formed the first man. Then He breathed into him, and the man came alive. His name was Adam.',
    'Adam gave names to all the animals. But none of them was a helper just right for him. So God made a woman, and brought her to Adam. Adam was very happy. Her name was Eve.',
    'God told them they could eat from every tree in the garden except one. That one tree was God’s, and they were to leave it alone. Would you like to have lived in a garden like that?',
  ], ['What was the name of God’s garden?', 'How did God make the first man?', 'Which tree were Adam and Eve not to eat from?']),

  s('The First Wrong Choice', 'Genesis 3', ('Genesis', 3), [
    'One day a serpent spoke to Eve. It told her that God was keeping something good from her. “Eat the fruit,” it said, “and you will be like God.”',
    'Eve looked at the fruit. It looked so good. She took some and ate it, and she gave some to Adam, and he ate it too.',
    'Right away they felt ashamed. When God came walking in the garden, they hid among the trees. They had not listened to God, and now they had to leave the beautiful garden.',
    'Adam and Eve were sad. But even then God made them clothes to wear, and He promised that one day Someone would come to put right what had gone wrong. Do you know who that Someone is?',
  ], ['What did the serpent tell Eve?', 'Why did Adam and Eve hide?', 'What did God promise even after they disobeyed?']),

  s('Noah Builds a Big Boat', 'Genesis 6–7', ('Genesis', 6), [
    'After many years there were lots of people on the earth. But most of them were wicked and unkind. God was sorry to see so much badness.',
    'There was one good man, Noah. He walked with God. God told Noah, “Make thee an ark.” An ark is a very big boat. God said a great flood was coming.',
    'Noah and his sons worked for a long time. People laughed at them, but Noah kept on obeying God. When the ark was finished, the animals came two by two — and some by sevens.',
    'Noah and his family went in, and God shut the door. Then the rain began. It rained for forty days and forty nights, but everyone inside the ark was safe.',
  ], ['Why was God sorry about the people on the earth?', 'What did God tell Noah to build?', 'Who shut the door of the ark?']),

  s('The Rainbow Promise', 'Genesis 8–9', ('Genesis', 9), [
    'The water covered the whole earth. The ark floated on and on. At last the rain stopped and the ark came to rest on a mountain.',
    'Noah sent out a dove. The first time, it came back because it found nowhere to rest. The next time, it came back with a fresh olive leaf in its beak! The land was getting dry.',
    'When God told them, Noah and his family and all the animals came out of the ark. The first thing Noah did was to thank God.',
    'Then God put a rainbow in the sky. He promised that He would never again send a flood to cover the whole earth. When you see a rainbow, you can remember that God keeps His promises.',
  ], ['What did the dove bring back to the ark?', 'What did Noah do first when he came out?', 'What does the rainbow help us remember?']),

  s('The Tall Tower', 'Genesis 11', ('Genesis', 11), [
    'After the flood, everyone on earth spoke one language. Some people said, “Let us build a city and a tower that reaches to heaven, so that we can make a great name for ourselves.”',
    'They were proud. They wanted to be great without God. So God mixed up their language. Suddenly one man could not understand what the next man said!',
    'They could not work together any more, and they stopped building. The people moved away to different lands, each family with its own language. The city was called Babel.',
    'God wants us to work together — but to do it for Him, not to show off. Why do you think pride is not good?',
  ], ['Why did the people want to build the tower?', 'What did God do to their language?', 'What was the city called?']),

  # ── The fathers ──
  s('Abraham Trusts God', 'Genesis 12', ('Genesis', 12), [
    'Abram lived in a city called Ur. One day God said to him, “Get thee out of thy country… unto a land that I will shew thee.”',
    'Abram did not know where he was going. But he trusted God. He packed up his tents, his sheep and his camels, and set out with his wife Sarai and his nephew Lot.',
    'They travelled a very long way, until they came to the land of Canaan. There God promised, “Unto thy seed will I give this land.” God also promised that all the families of the earth would be blessed through him.',
    'Later God changed his name to Abraham, which means “father of many.” Is it easy to trust God when you do not know what will happen next?',
  ], ['Where did Abram live at first?', 'Did Abram know where he was going?', 'What land did God promise to give him?']),

  s('A Baby for Sarah', 'Genesis 18; 21', ('Genesis', 21), [
    'Abraham and Sarah were very old, and they had no children. But God had promised them a son.',
    'One hot day three visitors came to Abraham’s tent. One of them said that by this time next year Sarah would have a baby boy. Sarah was listening behind the tent door, and she laughed. She thought she was much too old!',
    'But the visitor said, “Is any thing too hard for the LORD?”',
    'And it happened just as God said. Sarah had a baby boy, and they named him Isaac, which means “laughter.” Sarah said, “God hath made me to laugh.” This time she was laughing because she was so happy.',
  ], ['Why did Sarah laugh at first?', 'What question did the visitor ask?', 'What does the name Isaac mean?']),

  s('Jacob’s Dream of a Ladder', 'Genesis 28', ('Genesis', 28), [
    'Isaac grew up and had twin sons, Esau and Jacob. Jacob had to leave home and travel far away.',
    'One night Jacob was all alone. He lay down to sleep with a stone for a pillow. And he had a wonderful dream.',
    'He saw a ladder that reached from the earth all the way to heaven, and angels going up and coming down on it. At the top stood the LORD, who said, “I am with thee, and will keep thee in all places whither thou goest.”',
    'When Jacob woke up he said, “Surely the LORD is in this place; and I knew it not.” He called the place Bethel, which means “house of God.” Do you remember that God is with you too, even at night?',
  ], ['What did Jacob use for a pillow?', 'What did he see in his dream?', 'What did God promise Jacob?']),

  s('Joseph and His Coat', 'Genesis 37', ('Genesis', 37), [
    'Jacob had twelve sons. He loved Joseph more than the others, and he gave him a coat of many colours. Joseph’s brothers were jealous.',
    'Joseph had dreams that one day his family would bow down to him. When he told them, his brothers hated him even more.',
    'One day Joseph went to see his brothers in the fields. When they saw him coming they said, “Here comes the dreamer!” They threw him into a dry pit. Then they sold him to traders going to Egypt.',
    'The brothers dipped Joseph’s coat in blood and showed it to their father. Jacob thought a wild animal had killed Joseph, and he cried and cried. But God had not forgotten Joseph.',
  ], ['What gift did Jacob give Joseph?', 'Why were the brothers angry?', 'Where did the traders take Joseph?']),

  s('Joseph Forgives His Brothers', 'Genesis 39–45', ('Genesis', 45), [
    'In Egypt, Joseph was a slave and then a prisoner. But he always did what was right, and God was with him.',
    'God helped Joseph explain the king’s dreams: seven good years of food would come, and then seven years of hunger. So the king, Pharaoh, put Joseph in charge of all Egypt to store up food.',
    'When the hungry years came, Joseph’s brothers came to Egypt to buy food. They bowed down to him — but they did not know who he was! Joseph tested them, to see if they had changed. They had.',
    'Then Joseph cried and said, “I am Joseph!” He hugged his brothers and forgave them. “God did send me before you to preserve life,” he said. The whole family came to live in Egypt. Is it hard to forgive someone who has been unkind to you?',
  ], ['How did God help Joseph in Egypt?', 'Why did Joseph’s brothers come to Egypt?', 'What did Joseph do when he told them who he was?']),

  # ── Moses ──
  s('A Baby in a Basket', 'Exodus 2', ('Exodus', 2), [
    'Many years later a new king in Egypt made God’s people, the Israelites, his slaves. He even ordered that their baby boys be thrown into the river Nile.',
    'One mother hid her baby boy for three months. When she could hide him no longer, she made a basket, covered it so that water could not get in, and laid her baby in it among the reeds by the river. His sister Miriam watched from nearby.',
    'Pharaoh’s daughter came down to bathe. She saw the basket and opened it. The baby cried, and she felt sorry for him.',
    'Miriam ran up and asked, “Shall I fetch a nurse for him?” And she fetched the baby’s own mother! The princess named the baby Moses. God was taking care of him.',
  ], ['Why did the mother hide her baby?', 'Who found the basket?', 'Whom did Miriam bring to nurse the baby?']),

  s('The Bush That Did Not Burn', 'Exodus 3', ('Exodus', 3), [
    'Moses grew up in Pharaoh’s palace. Later he had to run away, and he became a shepherd in the land of Midian.',
    'One day, near Mount Horeb, Moses saw a strange sight. A bush was on fire — but it did not burn up! He went closer to look.',
    'God called to him from the bush: “Moses, Moses… put off thy shoes from off thy feet, for the place whereon thou standest is holy ground.”',
    'God said He had seen how His people were suffering in Egypt. He was sending Moses to bring them out. Moses was afraid, but God said, “Certainly I will be with thee.” Why do you think Moses took off his shoes?',
  ], ['What was strange about the bush?', 'What did God tell Moses to take off?', 'What did God send Moses to do?']),

  s('A Path Through the Sea', 'Exodus 14', ('Exodus', 14), [
    'At last Pharaoh let God’s people go. But soon he changed his mind and chased after them with his chariots and soldiers.',
    'The Israelites came to the Red Sea. The sea was in front of them, and the army was behind them. They were very afraid. But Moses said, “Fear ye not, stand still, and see the salvation of the LORD.”',
    'Moses stretched out his hand over the sea. God sent a strong wind all night, and the waters parted! The people walked through on dry ground, with a wall of water on each side.',
    'When the Egyptians followed, the waters came back. God’s people were safe on the other side, and Miriam led everyone in singing and dancing to praise God.',
  ], ['Why were the people afraid at the Red Sea?', 'What did God do to the water?', 'How did the people thank God?']),

  s('Bread from Heaven', 'Exodus 16', ('Exodus', 16), [
    'God’s people were travelling through the hot, dry wilderness. They grew hungry and began to grumble.',
    'God said, “I will rain bread from heaven for you.” In the morning, the ground was covered with little white flakes that tasted like wafers made with honey. The people called it manna.',
    'Each family gathered just enough for one day. On the sixth day they gathered twice as much, so that they could rest on the seventh day.',
    'For forty years God fed His people this way. God still gives us our daily bread. What do you say to God before you eat?',
  ], ['What did the people do when they were hungry?', 'What was the bread from heaven called?', 'Why did they gather twice as much on the sixth day?']),

  s('God’s Ten Commandments', 'Exodus 19–20', ('Exodus', 20), [
    'The people camped at the foot of Mount Sinai. Thunder rolled, lightning flashed, and the mountain shook. God was coming down to speak to them.',
    'God gave them ten commandments. They teach us to love God: to have no other gods, not to bow down to idols, to honour His name, and to keep a holy day of rest.',
    'They also teach us to love other people: to honour our father and mother, and not to kill, not to steal, not to lie, and not to want what belongs to someone else.',
    'God wrote the commandments on two tablets of stone. Jesus later said they come down to two things: love God with all your heart, and love your neighbour as yourself. Which commandment is about your father and mother?',
  ], ['Where did God give the commandments?', 'What did God write them on?', 'What two great things did Jesus say they teach?']),

  # ── The promised land ──
  s('The Walls Fall Down', 'Joshua 6', ('Joshua', 6), [
    'After Moses died, Joshua led God’s people into the land God had promised. The first city was Jericho, with big, strong walls.',
    'God gave Joshua some strange orders. For six days the soldiers and the priests carrying the ark of God were to march around the city once a day, with seven priests blowing trumpets. No one was to shout.',
    'On the seventh day they marched around seven times. Then the priests blew the trumpets, and Joshua said, “Shout; for the LORD hath given you the city.”',
    'Everyone shouted — and the walls fell down flat! The people had obeyed God even when His plan seemed strange, and God gave them the victory.',
  ], ['Who led the people after Moses?', 'How many times did they march around on the seventh day?', 'What happened when they shouted?']),

  s('Gideon’s Little Army', 'Judges 7', ('Judges', 7), [
    'The Midianites came again and again to steal Israel’s crops. God chose Gideon to save His people.',
    'Gideon gathered 32,000 men. But God said, “The people are too many.” He did not want them to boast that they had won by themselves. In the end Gideon had only three hundred men.',
    'At night each man took a trumpet and a torch hidden inside a jar. They surrounded the enemy camp. Then all at once they blew their trumpets, smashed their jars, held up their torches and shouted, “The sword of the LORD, and of Gideon!”',
    'The enemy soldiers woke up confused and ran away. Everyone knew that God had given the victory. Can God do great things even with a small number of people?',
  ], ['Why did God want a small army?', 'What did each man carry?', 'Who really won the battle?']),

  s('Ruth Stays with Naomi', 'Ruth 1–4', ('Ruth', 1), [
    'Naomi lived in Moab with her husband and two sons. Then her husband and her sons died. Naomi was very sad, and she decided to go home to Bethlehem.',
    'Her daughter-in-law Ruth would not leave her. Ruth said, “Whither thou goest, I will go… thy people shall be my people, and thy God my God.”',
    'In Bethlehem, Ruth worked hard gathering leftover grain in the fields to feed Naomi. The owner of the fields, a kind man named Boaz, saw how loving Ruth was. He let her gather as much as she needed.',
    'Later Boaz married Ruth, and they had a baby. That baby became the grandfather of King David! God blessed Ruth for her loyal love.',
  ], ['Why did Naomi go back to Bethlehem?', 'What did Ruth promise Naomi?', 'Who was Ruth’s great-grandson?']),

  s('God Calls Samuel', '1 Samuel 3', ('1 Samuel', 3), [
    'Hannah had prayed for a son, and God gave her Samuel. When he was still a little boy, she brought him to live at God’s house to help Eli the priest.',
    'One night, as Samuel lay sleeping, he heard a voice calling, “Samuel!” He ran to Eli and said, “Here am I.” But Eli said, “I called not; lie down again.”',
    'It happened a second time and a third time. Then Eli understood that God was calling the boy. He told Samuel to answer, “Speak, LORD; for thy servant heareth.”',
    'God called again, and Samuel answered just that way. God spoke to him, and Samuel grew up to be a great prophet. You are never too young to listen to God.',
  ], ['Who did Samuel think was calling him?', 'What did Eli tell him to say?', 'Can children listen to God too?']),

  # ── Kings ──
  s('David and the Giant', '1 Samuel 17', ('1 Samuel', 17), [
    'The Philistine army had a giant named Goliath. Every day he shouted at Israel’s army, “Send a man to fight me!” All the soldiers were afraid.',
    'Young David, a shepherd boy, brought food to his brothers in the army. He heard Goliath and said, “Who is this… that he should defy the armies of the living God?”',
    'David did not wear armour. He took his sling and five smooth stones from a brook. He said to Goliath, “I come to thee in the name of the LORD of hosts.”',
    'David put a stone in his sling and swung it. The stone hit Goliath in the forehead, and the giant fell to the ground! David trusted God, and God gave him the victory. What “giants” can God help you face?',
  ], ['Why were the soldiers afraid?', 'What did David take to fight Goliath?', 'In whose name did David come?']),

  s('Best Friends: David and Jonathan', '1 Samuel 18–20', ('1 Samuel', 20), [
    'King Saul’s son Jonathan loved David “as his own soul.” Jonathan gave David his robe, his sword and his bow, as a sign of their friendship.',
    'But King Saul grew jealous of David, because the people praised him. Saul even tried to kill him.',
    'Jonathan found out what his father planned. He went into a field and shot arrows, as a secret signal to David that he must hide and get away.',
    'The two friends hugged and cried, and promised to be kind to each other’s families for ever. Years later, when David was king, he kept that promise to Jonathan’s son. What makes a good friend?',
  ], ['What did Jonathan give David?', 'Why did Saul want to hurt David?', 'How did David keep his promise later?']),

  s('Solomon Asks for Wisdom', '1 Kings 3', ('1 Kings', 3), [
    'When David grew old, his son Solomon became king. Solomon was young, and being king was a big job.',
    'One night God appeared to Solomon in a dream and said, “Ask what I shall give thee.” Solomon could have asked for riches, or a long life, or victory over his enemies.',
    'But Solomon asked for “an understanding heart,” so that he could judge the people well and know good from bad.',
    'God was pleased. He gave Solomon wisdom — and riches and honour too! Solomon built a beautiful temple for God. If God said to you, “Ask what I shall give thee,” what would you ask?',
  ], ['What did God say to Solomon in the dream?', 'What did Solomon ask for?', 'What else did God give him?']),

  s('Elijah and the Ravens', '1 Kings 17', ('1 Kings', 17), [
    'Wicked King Ahab worshipped false gods. God sent the prophet Elijah to tell him there would be no rain for years.',
    'Then God told Elijah to hide by a brook. Every morning and every evening, ravens brought him bread and meat, and he drank from the brook.',
    'When the brook dried up, God sent Elijah to a poor widow. She had only a handful of flour and a little oil, just enough for one last meal for herself and her son.',
    'Elijah asked her to make him a little cake first, and promised that her flour and oil would not run out. She trusted God and did it — and her jar of flour and her jug of oil never ran out until the rain came back.',
  ], ['Who brought Elijah food by the brook?', 'How much food did the widow have?', 'What happened to her flour and oil?']),

  s('Fire from Heaven', '1 Kings 18', ('1 Kings', 18), [
    'Many people in Israel were praying to a false god called Baal. Elijah gathered them on Mount Carmel for a test.',
    'The prophets of Baal built an altar and put an offering on it. They called on Baal from morning until noon to send fire. They shouted and danced, but nothing happened.',
    'Then Elijah built an altar to the LORD. He had the people pour water all over it — three times! Then he prayed, “Hear me, O LORD, hear me, that this people may know that thou art the LORD God.”',
    'Fire fell from heaven and burnt up the offering, the wood, the stones and even the water! The people fell on their faces and said, “The LORD, he is the God.”',
  ], ['On which mountain did the test happen?', 'Why did Elijah pour water on the altar?', 'What did the people say when the fire fell?']),

  s('A Little Girl Helps Naaman', '2 Kings 5', ('2 Kings', 5), [
    'Naaman was a great army captain in Syria, but he had a terrible skin disease called leprosy.',
    'In his house was a little girl from Israel who served his wife. She said, “Would God my lord were with the prophet that is in Samaria! for he would recover him of his leprosy.”',
    'Naaman went to the prophet Elisha. Elisha sent a message: “Go and wash in Jordan seven times.” Naaman was angry. He had expected something grand! But his servants persuaded him to obey.',
    'Naaman dipped himself in the river seven times — and his skin became like the skin of a little child! He said, “Now I know that there is no God in all the earth, but in Israel.” A little girl’s kind words helped a great man find God.',
  ], ['Who told Naaman about Elisha?', 'What did Elisha tell him to do?', 'What happened when Naaman obeyed?']),

  # ── Exile ──
  s('Three Friends in the Fire', 'Daniel 3', ('Daniel', 3), [
    'King Nebuchadnezzar of Babylon made a huge golden statue. He ordered everyone to bow down to it when the music played.',
    'Three young Jewish friends — Shadrach, Meshach and Abednego — would not bow down. They would worship only God.',
    'The king was furious. He had the furnace heated seven times hotter, and the three friends were thrown in. But the king looked and said, “Lo, I see four men loose, walking in the midst of the fire… and the form of the fourth is like the Son of God.”',
    'When they came out, not a hair on their heads was burnt, and they did not even smell of smoke! The king praised their God. Is it brave to do what is right even when everyone else does wrong?',
  ], ['Why would the three friends not bow down?', 'How many men did the king see in the fire?', 'What happened to the friends?']),

  s('Daniel and the Lions', 'Daniel 6', ('Daniel', 6), [
    'Daniel was a wise and faithful man who served King Darius. Some jealous men tricked the king into making a law: for thirty days, no one could pray to anyone except the king.',
    'Daniel knew about the law. But he went home, opened his window toward Jerusalem, and prayed to God three times a day, just as he always did.',
    'The jealous men told the king, and Daniel was thrown into a den of hungry lions. The king could not sleep all night.',
    'Early in the morning the king ran to the den and called, “O Daniel… is thy God… able to deliver thee from the lions?” Daniel answered, “My God hath sent his angel, and hath shut the lions’ mouths.” How often do you pray to God?',
  ], ['What did the new law say?', 'What did Daniel keep doing?', 'Who shut the lions’ mouths?']),

  s('Jonah and the Great Fish', 'Jonah 1–3', ('Jonah', 1), [
    'God told Jonah to go to the great city of Nineveh and warn the people to stop their wickedness. But Jonah did not want to go. He got on a ship sailing the other way!',
    'God sent a mighty storm. The sailors were terrified. Jonah told them, “Cast me forth into the sea,” for he knew the storm was because of him. When they did, the sea became calm.',
    'God sent a great fish to swallow Jonah. For three days and three nights Jonah was inside the fish, and he prayed. Then the fish spat him out onto dry land.',
    'This time Jonah obeyed and went to Nineveh. The people were sorry for their sins, and God forgave them. God cares about all people — even those we think are bad.',
  ], ['Why did Jonah get on a ship?', 'How long was Jonah inside the fish?', 'What did the people of Nineveh do?']),

  s('Brave Queen Esther', 'Esther 4–8', ('Esther', 5), [
    'Esther was a young Jewish woman who became queen of Persia. Her cousin Mordecai had brought her up.',
    'A wicked man named Haman planned to kill all the Jews. Mordecai asked Esther to beg the king to save her people. But anyone who went to the king without being called could be put to death!',
    'Mordecai said, “Who knoweth whether thou art come to the kingdom for such a time as this?” Esther asked all the Jews to fast and pray for her. Then she said, “If I perish, I perish,” and went in to the king.',
    'The king held out his golden sceptre to welcome her. Esther told him about Haman’s evil plan, and her people were saved. God had put Esther in the right place at the right time.',
  ], ['Why was it dangerous to go to the king?', 'What did Esther ask the people to do first?', 'How was her people saved?']),

  # ── Jesus ──
  s('An Angel Visits Mary', 'Luke 1', ('Luke', 1), [
    'In the town of Nazareth lived a young woman named Mary. She was going to marry a carpenter named Joseph.',
    'One day the angel Gabriel came to her and said, “Hail, thou that art highly favoured, the Lord is with thee.” Mary was troubled. What could this mean?',
    'The angel said, “Fear not, Mary… thou shalt… bring forth a son, and shalt call his name JESUS. He shall be great, and shall be called the Son of the Highest.”',
    'Mary answered, “Behold the handmaid of the Lord; be it unto me according to thy word.” She trusted God completely. Would you trust God like Mary did?',
  ], ['Which angel visited Mary?', 'What name was the baby to have?', 'How did Mary answer the angel?']),

  s('Jesus Is Born', 'Luke 2', ('Luke', 2), [
    'The ruler Caesar Augustus ordered everyone to go to their family’s home town to be counted. So Joseph and Mary travelled to Bethlehem.',
    'The town was so full that there was no room for them in the inn. That night baby Jesus was born, and Mary wrapped Him in cloths and laid Him in a manger, where animals eat.',
    'Out in the fields, shepherds were watching their sheep. Suddenly an angel appeared, and said, “Fear not: for, behold, I bring you good tidings of great joy… unto you is born this day… a Saviour, which is Christ the Lord.”',
    'Then many angels praised God: “Glory to God in the highest, and on earth peace, good will toward men.” The shepherds hurried to Bethlehem and found the baby, just as the angel said.',
  ], ['Why did Joseph and Mary go to Bethlehem?', 'Where did Mary lay baby Jesus?', 'What good news did the angel bring the shepherds?']),

  s('Wise Men Follow a Star', 'Matthew 2', ('Matthew', 2), [
    'Wise men from the East saw a special star. They knew it meant a great king had been born, and they travelled a long way to find Him.',
    'In Jerusalem they asked, “Where is he that is born King of the Jews?” King Herod was troubled. He wanted no other king! He told them to find the child and come back to tell him.',
    'The star went before them until it stopped over the house where Jesus was. They were full of joy! They bowed down and worshipped Him, and gave Him gifts of gold, frankincense and myrrh.',
    'God warned them in a dream not to go back to Herod, and warned Joseph to take Mary and Jesus to Egypt, where they would be safe.',
  ], ['What led the wise men to Jesus?', 'What gifts did they bring?', 'Where did Joseph take Mary and Jesus?']),

  s('The Boy Jesus in the Temple', 'Luke 2', ('Luke', 2), [
    'Every year Jesus’ family went to Jerusalem for the Passover feast. When Jesus was twelve years old, He went too.',
    'On the way home, Mary and Joseph thought Jesus was with their friends. After a whole day they could not find Him! They hurried back to Jerusalem.',
    'After three days they found Him in the temple, sitting with the teachers, listening and asking questions. Everyone was amazed at how much He understood.',
    'Mary said, “Son, why hast thou thus dealt with us?” Jesus answered, “Wist ye not that I must be about my Father’s business?” Then He went home and obeyed His parents, and grew in wisdom and in favour with God and man.',
  ], ['How old was Jesus?', 'Where did Mary and Joseph find Him?', 'Whose “business” did Jesus say He must be about?']),

  s('Jesus Is Baptised', 'Matthew 3', ('Matthew', 3), [
    'John the Baptist lived in the wilderness and wore a coat of camel’s hair. He told people to turn away from their sins, and he baptised them in the river Jordan.',
    'One day Jesus came to be baptised. John said, “I have need to be baptised of thee, and comest thou to me?” But Jesus said it was right to do it.',
    'As Jesus came up out of the water, the heavens opened. The Spirit of God came down like a dove and rested on Him.',
    'And a voice from heaven said, “This is my beloved Son, in whom I am well pleased.” Now Jesus was ready to begin His great work.',
  ], ['Where did John baptise people?', 'What came down on Jesus like a dove?', 'What did the voice from heaven say?']),

  s('Water Becomes Wine', 'John 2', ('John', 2), [
    'Jesus, His mother and His disciples went to a wedding in Cana. During the feast, the wine ran out! That would be very embarrassing for the family.',
    'Mary told Jesus about it. Then she told the servants, “Whatsoever he saith unto you, do it.”',
    'There were six big stone water jars. Jesus said, “Fill the waterpots with water.” The servants filled them to the brim. Then Jesus said, “Draw out now,” and take some to the man in charge of the feast.',
    'The water had become wine — the very best wine! This was the first miracle Jesus did. Mary’s words are good for us too: whatever Jesus says to you, do it.',
  ], ['What ran out at the wedding?', 'What did Mary tell the servants?', 'What did Jesus turn the water into?']),

  s('Fishers of Men', 'Luke 5', ('Luke', 5), [
    'Peter and his partners had fished all night and caught nothing. In the morning Jesus got into Peter’s boat and taught the crowd from the water.',
    'Then Jesus said, “Launch out into the deep, and let down your nets.” Peter said, “Master, we have toiled all the night, and have taken nothing: nevertheless at thy word I will let down the net.”',
    'So many fish filled the net that it began to break! They called their friends James and John to help, and both boats were so full they began to sink.',
    'Peter fell down at Jesus’ knees. Jesus said, “Fear not; from henceforth thou shalt catch men.” They left their boats and followed Jesus. Do you think Peter was glad he obeyed?',
  ], ['How many fish had they caught during the night?', 'What did Jesus tell Peter to do?', 'What did Jesus say Peter would catch from now on?']),

  s('Jesus Calms the Storm', 'Mark 4', ('Mark', 4), [
    'One evening Jesus and His disciples got into a boat to cross the Sea of Galilee. Jesus was tired, and He fell asleep on a pillow at the back of the boat.',
    'A great storm came. The wind howled and the waves crashed into the boat until it was filling with water. The disciples woke Jesus: “Master, carest thou not that we perish?”',
    'Jesus stood up and spoke to the wind and the sea: “Peace, be still.” And the wind stopped, and there was a great calm.',
    'Jesus asked them, “Why are ye so fearful?” They said to one another, “What manner of man is this, that even the wind and the sea obey him?” When you are afraid, you can pray to Jesus.',
  ], ['What was Jesus doing when the storm came?', 'What did Jesus say to the wind and the sea?', 'What can you do when you are afraid?']),

  s('A Boy’s Lunch Feeds Thousands', 'John 6', ('John', 6), [
    'A huge crowd followed Jesus up a hillside. It was late, and the people were hungry. There were about five thousand men, besides women and children!',
    'Andrew said, “There is a lad here, which hath five barley loaves, and two small fishes: but what are they among so many?”',
    'Jesus told the people to sit on the grass. He took the loaves, gave thanks to God, and the disciples shared out the bread and the fish. Everyone ate as much as they wanted!',
    'Afterwards they gathered up twelve baskets full of leftovers. The boy shared what he had, and Jesus made it enough for everyone. What could you share with others?',
  ], ['How much food did the boy have?', 'What did Jesus do before sharing the food?', 'How many baskets of leftovers were there?']),

  s('Jesus Walks on the Water', 'Matthew 14', ('Matthew', 14), [
    'One night the disciples were rowing across the lake against a strong wind. Then they saw someone walking towards them on the water! They were frightened and cried out.',
    'Jesus said, “Be of good cheer; it is I; be not afraid.”',
    'Peter said, “Lord, if it be thou, bid me come unto thee on the water.” Jesus said, “Come.” Peter climbed out of the boat and walked on the water towards Jesus!',
    'But when Peter looked at the wind and the waves, he was afraid and began to sink. “Lord, save me!” he cried. Jesus reached out His hand and caught him. When we keep our eyes on Jesus, we do not need to be afraid.',
  ], ['Who did the disciples see walking on the water?', 'Why did Peter begin to sink?', 'What did Jesus do when Peter cried out?']),

  s('The Kind Samaritan', 'Luke 10', ('Luke', 10), [
    'A man asked Jesus, “Who is my neighbour?” Jesus answered with a story.',
    'A man was travelling from Jerusalem to Jericho. Robbers attacked him, took his clothes, beat him and left him half dead by the road.',
    'A priest came along, saw him, and passed by on the other side. Then a Levite came, looked, and passed by too. But then a Samaritan came — a man from a people the Jews did not get on with. He felt sorry for the hurt man. He bandaged his wounds, put him on his own donkey, took him to an inn and paid for his care.',
    'Jesus asked, “Which… was neighbour unto him that fell among the thieves?” The answer was, the one who showed mercy. Jesus said, “Go, and do thou likewise.” Who can you be kind to this week?',
  ], ['What happened to the man on the road?', 'Who helped him?', 'What did Jesus tell us to do?']),

  s('The Lost Sheep', 'Luke 15', ('Luke', 15), [
    'Jesus told about a shepherd who had a hundred sheep. One day he counted them — ninety-seven, ninety-eight, ninety-nine… One was missing!',
    'The shepherd left the ninety-nine and went looking for the lost one. He searched and searched until he found it.',
    'He put the sheep on his shoulders, rejoicing, and carried it home. He called his friends and neighbours together: “Rejoice with me; for I have found my sheep which was lost.”',
    'Jesus said there is joy in heaven over one person who turns back to God. Each one of us is precious to God, like that one little sheep.',
  ], ['How many sheep did the shepherd have?', 'What did he do when one was lost?', 'Why is there joy in heaven?']),

  s('The Son Who Came Home', 'Luke 15', ('Luke', 15), [
    'Jesus told about a man with two sons. The younger son asked for his share of the family money, then went far away and wasted it all.',
    'Soon he had nothing. He took a job feeding pigs, and he was so hungry he wished he could eat the pigs’ food. Then he thought, “I will arise and go to my father,” and say, “I have sinned.”',
    'While he was still a long way off, his father saw him and ran to him, hugged him and kissed him! The father gave him the best robe, a ring and shoes, and made a big feast.',
    '“This my son was dead, and is alive again; he was lost, and is found.” God is like that father. When we are sorry and come back to Him, He welcomes us with joy.',
  ], ['What did the younger son do with his money?', 'What did the father do when he saw him coming?', 'Who is the father in the story like?']),

  s('Jesus Loves Children', 'Mark 10', ('Mark', 10), [
    'Mothers and fathers brought their little children to Jesus, so that He would touch them and bless them.',
    'The disciples told them to go away. They thought Jesus was too busy and too important for little children.',
    'But Jesus was not pleased with the disciples. He said, “Suffer the little children to come unto me, and forbid them not: for of such is the kingdom of God.”',
    'Then Jesus took the children in His arms, put His hands on them and blessed them. Jesus loves you too, and you can always come to Him.',
  ], ['Why did people bring their children to Jesus?', 'What did the disciples do?', 'What did Jesus do with the children?']),

  s('The Man in the Tree', 'Luke 19', ('Luke', 19), [
    'Zacchaeus was a rich tax collector in Jericho. He had cheated people to get his money, so nobody liked him.',
    'When Jesus came through Jericho, Zacchaeus wanted to see Him. But he was short, and the crowd was in the way. So he ran ahead and climbed up a sycomore tree.',
    'When Jesus came to that spot, He looked up and said, “Zacchaeus, make haste, and come down; for to day I must abide at thy house.” Zacchaeus hurried down, full of joy.',
    'Zacchaeus said, “Behold, Lord, the half of my goods I give to the poor; and if I have taken any thing from any man… I restore him fourfold.” Jesus said, “This day is salvation come to this house.” Meeting Jesus changed his life.',
  ], ['Why did Zacchaeus climb a tree?', 'What did Jesus say to him?', 'How did Zacchaeus change?']),

  s('Lazarus, Come Forth!', 'John 11', ('John', 11), [
    'Jesus loved Martha, Mary and their brother Lazarus, who lived in Bethany. One day Lazarus became very sick, and then he died.',
    'When Jesus came, Lazarus had been in the tomb four days. Martha said, “Lord, if thou hadst been here, my brother had not died.” Jesus said, “I am the resurrection, and the life.”',
    'Jesus saw Mary and their friends crying, and Jesus wept too. Then He went to the tomb and told them to roll away the stone. He prayed to His Father.',
    'Then Jesus cried with a loud voice, “Lazarus, come forth.” And Lazarus came out, alive! Jesus has power even over death.',
  ], ['How long had Lazarus been in the tomb?', 'What did Jesus say He is?', 'What did Jesus call out at the tomb?']),

  s('Hosanna! The King Comes', 'Matthew 21', ('Matthew', 21), [
    'Jesus and His disciples came near to Jerusalem for the Passover. Jesus sent two disciples to bring a donkey and its colt.',
    'Jesus rode into the city on the colt, just as a prophet had said long before. A great crowd spread their coats on the road, and others cut branches from the palm trees and laid them down.',
    'Everyone shouted, “Hosanna to the Son of David: Blessed is he that cometh in the name of the Lord; Hosanna in the highest.”',
    'In the temple, children were still shouting “Hosanna!” Jesus was glad to hear their praise. We remember this day on Palm Sunday.',
  ], ['What animal did Jesus ride?', 'What did the crowd put on the road?', 'What did they shout?']),

  s('The Last Supper', 'Luke 22; John 13', ('Luke', 22), [
    'On the night before He died, Jesus ate the Passover meal with His twelve apostles in an upstairs room.',
    'Before the meal, Jesus took a towel and a bowl of water, and He washed His disciples’ feet. He said, “I have given you an example, that ye should do as I have done to you.”',
    'Then Jesus took bread, gave thanks, broke it and gave it to them: “This is my body which is given for you: this do in remembrance of me.” He gave them the cup too, and said it was His blood, shed for them.',
    'In the Celestial Church we remember this night with the washing of feet on Holy Thursday and with Holy Communion. What did Jesus teach by washing His disciples’ feet?',
  ], ['What did Jesus wash before the meal?', 'What did Jesus give them to remember Him by?', 'How does our Church remember this night?']),

  s('Jesus Dies for Us', 'Luke 23', ('Luke', 23), [
    'After the supper, Jesus prayed in the garden of Gethsemane. Judas came with soldiers, and they arrested Jesus.',
    'Jesus had done nothing wrong. But His enemies took Him to Pilate, the Roman governor, and the crowd shouted, “Crucify him!” The soldiers put a crown of thorns on His head.',
    'They nailed Jesus to a cross at a place called Calvary. Even then He prayed for the people who hurt Him: “Father, forgive them; for they know not what they do.”',
    'At noon the sky went dark. Then Jesus cried, “Father, into thy hands I commend my spirit,” and He died. Jesus gave His life so that our sins can be forgiven. We remember this on Good Friday.',
  ], ['Where did Jesus pray before He was arrested?', 'What did Jesus pray on the cross?', 'Why did Jesus give His life?']),

  s('He Is Risen!', 'Matthew 28; John 20', ('Matthew', 28), [
    'Jesus’ body was laid in a tomb cut out of rock, and a big stone was rolled across the door. His friends were very sad.',
    'Early on the first day of the week, Mary Magdalene and other women came to the tomb. There was a great earthquake! An angel had rolled the stone away and was sitting on it.',
    'The angel said, “Fear not ye: for I know that ye seek Jesus, which was crucified. He is not here: for he is risen, as he said.”',
    'The women ran with fear and great joy to tell the disciples — and Jesus Himself met them on the way! Jesus is alive! That is why Easter is the happiest day of all.',
  ], ['What had happened to the stone?', 'What did the angel say?', 'Who met the women on the way?']),

  s('Jesus Goes Up to Heaven', 'Acts 1', ('Acts', 1), [
    'For forty days after He rose, Jesus appeared to His disciples many times. He ate with them and taught them about the kingdom of God.',
    'Jesus told them to wait in Jerusalem for the Holy Spirit. He said, “Ye shall be witnesses unto me… unto the uttermost part of the earth.”',
    'Then, while they were watching on the Mount of Olives, Jesus was taken up, and a cloud hid Him from their sight.',
    'As they stood looking up, two men in white clothes said, “This same Jesus… shall so come in like manner as ye have seen him go into heaven.” Jesus is coming again!',
  ], ['How long did Jesus stay with His disciples after He rose?', 'What did He tell them to wait for?', 'What did the two men in white promise?']),

  s('The Holy Spirit Comes', 'Acts 2', ('Acts', 2), [
    'On the day of Pentecost, the disciples were all together in one place, praying.',
    'Suddenly there came a sound from heaven like a rushing mighty wind, and it filled the house. Tongues like fire rested on each of them, and they were all filled with the Holy Ghost.',
    'They began to speak in other languages. People from many countries were in Jerusalem, and each one heard them telling the wonderful works of God in his own language!',
    'Peter preached about Jesus, and about three thousand people believed and were baptised that day. The Holy Spirit still helps God’s people today to pray, to praise and to tell others about Jesus.',
  ], ['What sound came from heaven?', 'What rested on each of the disciples?', 'How many people believed that day?']),

  s('A Bright Light on the Road', 'Acts 9', ('Acts', 9), [
    'A man named Saul hated the followers of Jesus. He set off to Damascus to arrest them.',
    'On the way, a bright light from heaven flashed around him, and he fell to the ground. A voice said, “Saul, Saul, why persecutest thou me?” Saul asked, “Who art thou, Lord?” The answer came: “I am Jesus.”',
    'When Saul got up, he was blind. His friends led him by the hand into Damascus. For three days he could not see, and he did not eat or drink.',
    'God sent a disciple named Ananias to put his hands on Saul. Something like scales fell from his eyes, and he could see again! Saul was baptised, and he became Paul, who told the whole world about Jesus.',
  ], ['Where was Saul going, and why?', 'Who spoke to Saul from heaven?', 'Whom did God send to help him see again?']),

  s('Shipwrecked!', 'Acts 27–28', ('Acts', 27), [
    'Paul was a prisoner being taken by ship to Rome. A terrible storm blew for many days. The sailors threw cargo overboard and gave up hope.',
    'But an angel of God told Paul that no one would be lost. Paul told everyone, “Be of good cheer: for I believe God, that it shall be even as it was told me.”',
    'The ship ran aground and broke apart. Some swam and some floated on boards — and all 276 people reached the land safely! The island was called Melita, now Malta.',
    'A snake bit Paul’s hand as he put sticks on a fire, but he shook it off and was not hurt. He prayed for the sick on the island and they were healed. Even in a storm, God took care of Paul.',
  ], ['Who told Paul that everyone would be safe?', 'How many people reached land?', 'What happened when the snake bit Paul?']),
]
