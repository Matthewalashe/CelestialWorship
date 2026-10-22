"""
Builds public/data/constitution.json from excerpts of the Constitution of the
Celestial Church of Christ (Nigeria Diocese), first revised edition 1980
(promulgated 29 March 1980; prepared by the Board of Trustees for the Pastor-in-Council).

Clause numbers and wording follow the printed booklet. The booklet is "Copyright reserved"
by the Board of Trustees: the app shows excerpts for study, and the full text should only
be added with the Board's permission.

Run: python data-src/constitution_1980.py
"""
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'public' / 'data' / 'constitution.json'


def clause(number, text, *subs):
    letters = 'abcdefghijklmnopqrstuvwxyz'
    return {
        'number': str(number),
        'text': text,
        'subClauses': [{'letter': s[0], 'text': s[1]} if isinstance(s, tuple) else {'letter': letters[i], 'text': s}
                       for i, s in enumerate(subs)],
    }


SECTIONS = [
    {
        'id': 'the_church', 'title': 'The Church', 'icon': '⛪', 'type': 'clauses',
        'clauses': [
            clause(1, 'The Church is part of the one spiritual, world-wide, united, indivisible Holy Church which came into the world '
                      'from heaven by DIVINE ORDER on the 29th of September 1947 in Porto Novo, Republic of Benin (formerly Republic of '
                      'Dahomey) through a single individual, the Reverend Pastor Prophet Founder Samuel Bilehou Joseph Oshoffa.'),
            clause('1 (cont.)', 'The Church in Nigeria is a Diocese of the world-wide Celestial Church of Christ, with National (Diocesan) '
                                'Headquarters at 12/15 Church Street, Makoko, Yaba, Lagos State; the Supreme Headquarters in Porto Novo, '
                                'Republic of Benin; and the International Headquarters at Mission House, Ketu, Lagos State.'),
            clause(3, 'The name of the Church came down from Heaven by divine revelation through Mr. Alexander Yanga, who was held in '
                      'trance for seven days. At the end of the seventh day he wrote on the wall: "EGLISE DU CHRISTIANISME CELESTE", '
                      'meaning "Celestial Church of Christ".'),
            clause(92, 'The name of the Church, "Eglise du Christianisme Celeste", is "Celestial Church of Christ" in English and '
                       '"Ijo Mimo ti Kristi lati orun wa" in Yoruba.'),
            clause(91, 'The name of the Church, the tenets and mode of worship, and the service hymns are all revealed through the '
                       'Holy Spirit as promised by our Lord Jesus Christ (John 14:25-26).'),
        ],
    },
    {
        'id': 'divine_order', 'title': 'The Divine Order (1947)', 'icon': '🕊️', 'type': 'narrative',
        'content': 'On the 29th of September, 1947, in the deep mystery of the divine appearance, during prayer, of the winged angel '
                   'bathed in intense light, word came from God to the Founder.',
        'paragraphs': [
            '“It is the wish of God to send you on an errand of preaching to the world. Many nominal Christians there are who, when '
            'confronted by difficulties and problems of this world, they run after fetish priests and other powers of darkness for all '
            'kinds of assistance. Consequently, on their death, they cannot see Christ because, by their action, Satan has left his '
            'spiritual mark on them. To assist you in your work so that men may listen to and follow you, miraculous works of Holy divine '
            'healing will be carried out by you in the name of Jesus Christ. These works of divine healing and God’s spiritual mark on '
            'you will testify to the fact that God sent you.” (Clause 2)',
            'Thus was born the world-wide Celestial Church of Christ.',
            'The Founder, born in 1909 in Porto Novo, was a carpenter and later an ebony trader. On 23rd May 1947, the day of an eclipse '
            'of the sun, he was lost in the forest, where he heard the call of God, and spent three months there before returning to '
            'Porto Novo (Foundation History, as told by the Founder on 18th January 1969 at Makoko).',
            'After his first five years as “Evangelist”, the Founder was allowed by Divine Order to use the name “EPASTORAL”, translated '
            'as “PASTOR” (Clause 4).',
        ],
    },
    {
        'id': 'tenets', 'title': 'The Twelve Tenets', 'icon': '📜', 'type': 'clauses',
        'clauses': [
            clause(93, 'It is ordained by the Holy Spirit that:',
                   ('1', 'members of Celestial Church of Christ are forbidden to engage or participate in any form of idolatry, fetish ceremony or cults, black magic and charms;'),
                   ('2', 'cigarette or tobacco smoking or snuffing or any type of weed smoking or snuffing is forbidden;'),
                   ('3', 'consumption of any form of alcohol, wine or any strong drink that can intoxicate is forbidden, as the odour of all these is repugnant to the presence of the Holy Spirit;'),
                   ('4', 'consumption of pork or any food offered as sacrifice to idols or other powers of darkness is forbidden;'),
                   ('5', 'members are forbidden to wear apparels made of black or red materials except for professional reasons;'),
                   ('6', 'members should not wear shoes when wearing their sutana or within the premises of the Church;'),
                   ('7', 'male and female members are forbidden to sit together side by side within the Church and its premises;'),
                   ('8', 'female members during menstruation are not allowed to come within the precincts of the Church until after their sanctification after seven clear days;'),
                   ('9', 'female members are forbidden from entering the altar area or leading the congregation in worship;'),
                   ('10', 'only white candles are to be used; coloured candles are strictly forbidden;'),
                   ('11', 'fornication and adultery are forbidden;'),
                   ('12', 'Holy is the Celestial Church of Christ and all who worship in her should endeavour to be clean in body and in soul.')),
        ],
    },
    {
        'id': 'worship', 'title': 'Mode & Order of Worship', 'icon': '🕯️', 'type': 'clauses',
        'clauses': [
            clause(94, 'All forms of worship are entirely as revealed by the Holy Spirit — the setting of the altar and the seats, the number '
                       'of candles for the various types of services and the seating arrangement. The seating arrangement was revealed through '
                       'a prophetess who, in the wilderness on Friday 5th October 1947, sketched it using oranges.'),
            clause(95, 'There is an Order of Service for different occasions such as Marriage, Funeral and Mass in remembrance of the Dead. '
                       'The order for each occasion is strictly as revealed by the Holy Spirit and is set out in the booklet “Order of Service”.'),
            clause(96, 'The Order of Service contains certain Holy Names which usually precede reading from the Psalms, for example: '
                       'Eh-Yibah (Oluwa Alanu), Eli-Yah (Oluwa Olorun), Eli-Bamah-Yabah (Oluwa-Omo Emi-Michael), Agashadual (Oba Olusegun), '
                       'Jehovah Jecho-Hirami (Oba Olubukun).'),
            clause(98, 'The sermon is delivered by a Church elder appointed by the Pastor’s Representative. It shall be taken from the Bible '
                       'texts appointed for the day, and must not refer to newspaper publications, politics, government policy, or anything '
                       'derogatory to other religious organisations.'),
            clause(106, 'During services the utmost solemnity and attention shall be observed; gossip, side-talk or pasting of currency notes '
                        'on members of the Choir shall be totally avoided.'),
            clause(177, 'The Altar area within all Church buildings shall be rectangular, shall face EAST, and shall be cut off from the rest '
                        'of the Church by a handrailing along its full width.'),
        ],
    },
    {
        'id': 'sacraments', 'title': 'Holy Rites & Annual Observances', 'icon': '✝️', 'type': 'clauses',
        'clauses': [
            clause('99a', 'BAPTISM — by immersion. Before being accepted as a member one must be baptised or re-baptised into the faith of '
                          'Celestial Church of Christ (Acts 19:1-6).'),
            clause('99b', 'HOLY COMMUNION — generally held quarterly, on Holy Thursday (pre-Easter) and on Christmas Day; also on special '
                          'occasions such as Marriage, Funeral and Mass in remembrance of departed souls.'),
            clause('99c', 'ANNUAL WASHING OF FEET — on the Thursday of Holy Week, in commemoration of Jesus washing the feet of His disciples '
                          '(John 13:5-9).'),
            clause('99d', 'ANNUAL CONVOCATION AT CHRISTMAS — members convocate for Christmas in remembrance of the birth of Christ (Luke 2:1). '
                          'The 1980 text names the sea side at Porto-Novo; the convocation has since been held at the Celestial City, Imeko.'),
            clause('99e', 'ANNUAL EASTER CONGREGATION — from Good Friday to Easter Sunday, with services at 9.00 a.m., 12.00 noon and '
                          '3.00 p.m. on Good Friday, a midnight procession to the cemetery on Saturday, and a service of joy and victory on '
                          'Easter Sunday morning.'),
            clause('99f', 'ANNUAL HARVEST THANKSGIVING — every parish observes Harvest in two parts: the Juvenile Harvest on the first Sunday '
                          'in June, and the Adult Harvest on a date agreed with the Diocesan Headquarters (not the first Sunday in October, '
                          'kept for the Supreme Headquarters, or the first Sunday in August, kept for the Diocesan Headquarters).'),
            clause('99g', 'HOLY MARY’S DAY — the first Friday of July, commemorating the appearance of Holy Mary to the Pastor on 15th July '
                          '1977. It was first observed on Friday 7th July 1978.'),
            clause(198, 'ANOINTMENT — after baptism, anointment is very important. It is performed only by the Pastor, usually once a year '
                        'during the Christmas/New Year period.'),
        ],
    },
    {
        'id': 'membership', 'title': 'Membership', 'icon': '🤝', 'type': 'clauses',
        'clauses': [
            clause(101, 'All persons who earnestly and sincerely desire to be saved and therefore accept Jesus Christ as the Son of God and '
                        'only Lord and Saviour of mankind, and who wish to worship and serve Him in the Church, are welcome into the fold.'),
            clause(102, 'Nobody is considered a member until baptised in the Celestial Church of Christ, irrespective of any previous '
                        'baptism in another Christian denomination.'),
            clause(103, 'A worshipper desiring to become a member shall:',
                   ('i', 'renounce membership of all secret cults, societies, fraternities, etc.;'),
                   ('ii', 'renounce the worship of all idols and fetish;'),
                   ('iii', 'desist from the worship of Satan and all his works, from following any fetish priests and from engaging in magic or any powers of darkness;'),
                   ('iv', 'renounce all titles, positions or associations which conflict with the above (e.g. any type of chieftaincy title);'),
                   ('v', 'declare that living or dead he is a full member, and on his death should be buried according to the tenets and rites of the Church;'),
                   ('vi', 'sign a declaration of adherence to the above (Exodus 20:3; 2 Corinthians 6:14-15).')),
            clause(105, 'New members, before admission as worshippers, undergo sanctification with a pail of water and candle, conducted by the '
                        'Pastor’s Representative in charge of the Parish or his appointee.'),
            clause(196, 'All marriages solemnized in holy wedlock in other Christian Churches are recognized by Celestial Church of Christ.'),
        ],
    },
    {
        'id': 'women', 'title': 'Role of Female Members', 'icon': '👗', 'type': 'clauses',
        'clauses': [
            clause(189, 'Female members during menstruation do not come within the precincts of the Church until after their sanctification '
                        'after seven clear days; where it extends beyond seven days, two clear days are allowed after stoppage (Lev. 15:19).'),
            clause(190, 'Women are not permitted to preach the sermon, read the lesson or make announcements during devotional services, or '
                        'perform spiritual functions in conducting services other than saying prayers when asked and reading Bible portions '
                        'quoted by the preacher.'),
            clause(192, 'Outside the Church, amongst a congregation of women and in outdoor preaching, female members may perform spiritual '
                        'functions of preaching.'),
            clause(193, 'Female members do not come within the precincts of the Church until forty-one days after child birth, when they '
                        'come to Church for thanksgiving.'),
            clause(194, 'Sanctification after the period is with a pail of water, candle, sponge and soap at the Western entrance, with prayer '
                        'by the Pastor’s Representative or his appointee. Separately, all members dip their hands in the holy water by the '
                        'door and make the sign of the cross before entering the Church.'),
        ],
    },
    {
        'id': 'structure', 'title': 'Church Structure', 'icon': '🏛️', 'type': 'clauses',
        'clauses': [
            clause(107, 'Celestial Church of Christ is one and indivisible. For organisational purposes:',
                   ('a', 'INTERNATIONAL HEADQUARTERS: the Church is world-wide. Its Supreme Headquarters is at Porto Novo, Republic of Benin, which is also its birth-place; the International Headquarters of the Church world-wide is at Mission House, Ketu, Lagos State, Nigeria.'),
                   ('b', 'DIOCESE: the entire Church within Nigeria, with National (Diocesan) Headquarters at Makoko, Yaba, Lagos — including, for the time being, parishes outside Nigeria administered from Nigeria.'),
                   ('c', 'DISTRICTS: groups of parishes ministered to by Pastor’s Representatives of the rank of Assistant Evangelist and above.'),
                   ('d', 'PARISH: an individual Church congregation within the Diocese.')),
            clause(156, 'The overall machinery for the government of the Church (Nigeria Diocese) is vested in the Pastor-in-Council, under the '
                        'ultimate authority of the Pastor. Its members are the Pastor (Chairman), the Head of the Diocese and his Deputy, the '
                        'other members of the Board of Trustees, and members the Pastor may co-opt (Clause 157).'),
            clause(112, 'There is a Representative of the Pastor in each Parish — an Elder or Leader or other rank in charge — who performs all '
                        'the duties of the Spiritual Leader in the Parish.'),
            clause(180, 'All Church property belongs not to any individual or group, and shall be registered and retained in the name of the '
                        'Celestial Church of Christ.'),
            clause(183, 'The Pastor-in-Council, under the ultimate authority of the Pastor, is responsible for interpreting the doctrinal '
                        'standards and the provisions of this Constitution.'),
            clause(184, 'The Pastor, by himself or on the recommendation of the Pastor-in-Council, may revoke, alter or add to any of the '
                        'provisions of this Constitution.'),
        ],
    },
    {
        'id': 'pastor', 'title': 'The Pastor & Succession', 'icon': '👑', 'type': 'clauses',
        'clauses': [
            clause(108, 'The Pastor as the ultimate Spiritual Head of the Celestial Church of Christ worldwide is vested with the sole ultimate '
                        'and unchallengeable authority on all matters affecting Church life.'),
            clause(109, 'The Celestial Church of Christ worldwide shall have one Head who shall be known and called “The Pastor” (John 10:14-16).'),
            clause(110, 'There can be only one Founder. The title “Pastor and Founder” is exclusive to Rev. Pastor Samuel Bilehou Joseph Oshoffa. '
                        'Any future head of the Church shall be called simply “The Pastor”.'),
            clause(5, 'The final sole authority in the Church is vested in the Pastor or the person who succeeds him on his death.'),
            clause(6, 'Whoever is chosen to succeed as Pastor should have his Headquarters in the land set aside for the Pastor in Porto Novo, '
                      'Republic of Benin.'),
            clause(111, 'Concerning the succession, it is firmly established that:',
                   ('i', 'the successor to the office of Pastor can be from any rank in the hierarchy of the Church and shall, at a time chosen by God to reveal this unto the erstwhile incumbent of the post of Pastor, be named and proclaimed the successor;'),
                   ('ii', 'on succeeding after the transition of his predecessor in office, the new Pastor shall occupy the Pastor’s Chair in the inner altar.')),
            clause('7–9', 'If the Founder died in the Republic of Benin he was to be buried in the land he pointed out in Porto Novo; if in Nigeria, '
                          'in the town of Imeko near his mother. His burial ground is set aside as Holy ground and a place of pilgrimage.'),
        ],
    },
    {
        'id': 'ranks', 'title': 'Ranks & Robes', 'icon': '🎖️', 'type': 'clauses',
        'clauses': [
            clause(185, 'The Church has a hierarchy in which the ranks are distinguished by the robes worn, as set out in the publication '
                        '“Order of Seniority and Promotion and Dressing Rank by Rank”.'),
            clause(186, 'Normally, the highest ranks to which members may be elevated by promotion are Superior Senior Leader, Superior Senior '
                        'Wolider and Superior Senior Elder; promotion to Assistant Evangelist and above is not automatic.'),
            clause(188, 'The Pastor may, at his sole discretion, make direct appointments to any rank, including Assistant Evangelist, '
                        'Evangelist and above.'),
            clause(182, 'Full-time Church workers — Supreme Evangelist, Superior Senior Evangelist, Senior Evangelist, Evangelist, Assistant '
                        'Evangelists — receive stipends from the Pastor’s share of the monthly takings (Malachi 3:8-12).'),
        ],
    },
]

META = {
    'title': 'Constitution of the Celestial Church of Christ',
    'subtitle': 'Ijo Mimo ti Kristi lati Orun wa · Eglise du Christianisme Céleste',
    'version': 'Nigeria Diocese — first revised edition, 1980',
    'note': 'Excerpts for study, numbered as in the printed Constitution (drafted 29 February 1976 – 29 February 1980, '
            'promulgated 29 March 1980, prepared by the Board of Trustees for the Pastor-in-Council). Copyright reserved by the '
            'Board of Trustees. Some provisions — such as the venue of the Christmas convocation — have changed in practice since 1980, '
            'and different parts of the Church today follow different editions; check with your parish where it matters.',
}

if __name__ == '__main__':
    OUT.write_text(json.dumps({'meta': META, 'sections': SECTIONS}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'wrote {OUT} ({sum(len(s.get("clauses", [])) for s in SECTIONS)} clauses)')
