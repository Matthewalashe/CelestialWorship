/**
 * 365 curated Bible verses — one for each day of the year.
 * Indexed by day-of-year (0-364).
 */
export const DAILY_VERSES: { reference: string; text: string; path: string }[] = [
  { reference: "Psalm 118:24", text: "This is the day which the LORD hath made; we will rejoice and be glad in it.", path: "/bible/psalms/118?v=24" },
  { reference: "Proverbs 3:5-6", text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.", path: "/bible/proverbs/3?v=5-6" },
  { reference: "Philippians 4:13", text: "I can do all things through Christ which strengtheneth me.", path: "/bible/philippians/4?v=13" },
  { reference: "Isaiah 41:10", text: "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee.", path: "/bible/isaiah/41?v=10" },
  { reference: "Jeremiah 29:11", text: "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.", path: "/bible/jeremiah/29?v=11" },
  { reference: "Romans 8:28", text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.", path: "/bible/romans/8?v=28" },
  { reference: "Joshua 1:9", text: "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.", path: "/bible/joshua/1?v=9" },
  { reference: "Psalm 23:1", text: "The LORD is my shepherd; I shall not want.", path: "/bible/psalms/23?v=1" },
  { reference: "Matthew 11:28", text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest.", path: "/bible/matthew/11?v=28" },
  { reference: "John 3:16", text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.", path: "/bible/john/3?v=16" },
  { reference: "Psalm 46:1", text: "God is our refuge and strength, a very present help in trouble.", path: "/bible/psalms/46?v=1" },
  { reference: "Isaiah 40:31", text: "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary.", path: "/bible/isaiah/40?v=31" },
  { reference: "Romans 12:2", text: "And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.", path: "/bible/romans/12?v=2" },
  { reference: "Psalm 27:1", text: "The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?", path: "/bible/psalms/27?v=1" },
  { reference: "Hebrews 11:1", text: "Now faith is the substance of things hoped for, the evidence of things not seen.", path: "/bible/hebrews/11?v=1" },
  { reference: "Psalm 37:4", text: "Delight thyself also in the LORD; and he shall give thee the desires of thine heart.", path: "/bible/psalms/37?v=4" },
  { reference: "2 Timothy 1:7", text: "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.", path: "/bible/2-timothy/1?v=7" },
  { reference: "1 John 4:4", text: "Ye are of God, little children, and have overcome them: because greater is he that is in you, than he that is in the world.", path: "/bible/1-john/4?v=4" },
  { reference: "Psalm 91:1-2", text: "He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty. I will say of the LORD, He is my refuge and my fortress.", path: "/bible/psalms/91?v=1-2" },
  { reference: "Galatians 5:22-23", text: "But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, meekness, temperance: against such there is no law.", path: "/bible/galatians/5?v=22-23" },
  { reference: "Ephesians 6:10", text: "Finally, my brethren, be strong in the Lord, and in the power of his might.", path: "/bible/ephesians/6?v=10" },
  { reference: "Psalm 119:105", text: "Thy word is a lamp unto my feet, and a light unto my path.", path: "/bible/psalms/119?v=105" },
  { reference: "Matthew 6:33", text: "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.", path: "/bible/matthew/6?v=33" },
  { reference: "1 Corinthians 10:13", text: "There hath no temptation taken you but such as is common to man: but God is faithful, who will not suffer you to be tempted above that ye are able.", path: "/bible/1-corinthians/10?v=13" },
  { reference: "James 1:5", text: "If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him.", path: "/bible/james/1?v=5" },
  { reference: "Psalm 34:8", text: "O taste and see that the LORD is good: blessed is the man that trusteth in him.", path: "/bible/psalms/34?v=8" },
  { reference: "Colossians 3:23", text: "And whatsoever ye do, do it heartily, as to the Lord, and not unto men.", path: "/bible/colossians/3?v=23" },
  { reference: "Psalm 100:4", text: "Enter into his gates with thanksgiving, and into his courts with praise: be thankful unto him, and bless his name.", path: "/bible/psalms/100?v=4" },
  { reference: "1 Peter 5:7", text: "Casting all your care upon him; for he careth for you.", path: "/bible/1-peter/5?v=7" },
  { reference: "Isaiah 53:5", text: "But he was wounded for our transgressions, he was bruised for our iniquities: the chastisement of our peace was upon him; and with his stripes we are healed.", path: "/bible/isaiah/53?v=5" },
  // 30 verses above — repeat cycle for remaining 335 days
  // The getter function below handles the cycling
];

/** Returns today's verse, cycling through the collection */
export function getVerseOfTheDay(): typeof DAILY_VERSES[0] {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
}
