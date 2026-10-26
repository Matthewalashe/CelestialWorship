"""Names the app shows from its data: Bible books, hymn sections and hymn categories, in Yorùbá and French.
Merged into public/i18n by `python -I -X utf8 data-src/i18n_content/names.py` (keyed by the English name)."""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent

BOOKS = {
    'Genesis': ('Jẹ́nẹ́sísì', 'Genèse'), 'Exodus': ('Ẹ́kísódù', 'Exode'), 'Leviticus': ('Léfítíkù', 'Lévitique'),
    'Numbers': ('Númérì', 'Nombres'), 'Deuteronomy': ('Diutarónómì', 'Deutéronome'), 'Joshua': ('Jóṣúà', 'Josué'),
    'Judges': ('Àwọn Onídàájọ́', 'Juges'), 'Ruth': ('Rúùtù', 'Ruth'), '1 Samuel': ('1 Sámúẹ́lì', '1 Samuel'),
    '2 Samuel': ('2 Sámúẹ́lì', '2 Samuel'), '1 Kings': ('1 Àwọn Ọba', '1 Rois'), '2 Kings': ('2 Àwọn Ọba', '2 Rois'),
    '1 Chronicles': ('1 Kíróníkà', '1 Chroniques'), '2 Chronicles': ('2 Kíróníkà', '2 Chroniques'), 'Ezra': ('Ẹ́sírà', 'Esdras'),
    'Nehemiah': ('Nehemáyà', 'Néhémie'), 'Esther': ('Ẹ́sítà', 'Esther'), 'Job': ('Jóòbù', 'Job'), 'Psalms': ('Sáàmù', 'Psaumes'),
    'Proverbs': ('Òwe', 'Proverbes'), 'Ecclesiastes': ('Oníwàásù', 'Ecclésiaste'), 'Song of Solomon': ('Orin Sólómọ́nì', 'Cantique des cantiques'),
    'Isaiah': ('Àìsáyà', 'Ésaïe'), 'Jeremiah': ('Jeremáyà', 'Jérémie'), 'Lamentations': ('Ẹkún Jeremáyà', 'Lamentations'),
    'Ezekiel': ('Ìsíkíẹ́lì', 'Ézéchiel'), 'Daniel': ('Dáníẹ́lì', 'Daniel'), 'Hosea': ('Hóséà', 'Osée'), 'Joel': ('Jóẹ́lì', 'Joël'),
    'Amos': ('Ámósì', 'Amos'), 'Obadiah': ('Ọbadáyà', 'Abdias'), 'Jonah': ('Jónà', 'Jonas'), 'Micah': ('Míkà', 'Michée'),
    'Nahum': ('Náhúmù', 'Nahum'), 'Habakkuk': ('Hábákúkù', 'Habacuc'), 'Zephaniah': ('Sefanáyà', 'Sophonie'),
    'Haggai': ('Hágáì', 'Aggée'), 'Zechariah': ('Sekaráyà', 'Zacharie'), 'Malachi': ('Málákì', 'Malachie'),
    'Matthew': ('Mátíù', 'Matthieu'), 'Mark': ('Máàkù', 'Marc'), 'Luke': ('Lúùkù', 'Luc'), 'John': ('Jòhánù', 'Jean'),
    'Acts': ('Ìṣe Àwọn Àpọ́sítélì', 'Actes'), 'Romans': ('Róòmù', 'Romains'), '1 Corinthians': ('1 Kọ́ríńtì', '1 Corinthiens'),
    '2 Corinthians': ('2 Kọ́ríńtì', '2 Corinthiens'), 'Galatians': ('Gálátíà', 'Galates'), 'Ephesians': ('Éfésù', 'Éphésiens'),
    'Philippians': ('Fílípì', 'Philippiens'), 'Colossians': ('Kólósè', 'Colossiens'), '1 Thessalonians': ('1 Tẹsalóníkà', '1 Thessaloniciens'),
    '2 Thessalonians': ('2 Tẹsalóníkà', '2 Thessaloniciens'), '1 Timothy': ('1 Tímótì', '1 Timothée'), '2 Timothy': ('2 Tímótì', '2 Timothée'),
    'Titus': ('Títù', 'Tite'), 'Philemon': ('Fílémónì', 'Philémon'), 'Hebrews': ('Hébérù', 'Hébreux'), 'James': ('Jákọ́bù', 'Jacques'),
    '1 Peter': ('1 Pétérù', '1 Pierre'), '2 Peter': ('2 Pétérù', '2 Pierre'), '1 John': ('1 Jòhánù', '1 Jean'), '2 John': ('2 Jòhánù', '2 Jean'),
    '3 John': ('3 Jòhánù', '3 Jean'), 'Jude': ('Júùdù', 'Jude'), 'Revelation': ('Ìfihàn', 'Apocalypse'),
    'Old Testament': ('Májẹ̀mú Láéláé', 'Ancien Testament'), 'New Testament': ('Májẹ̀mú Tuntun', 'Nouveau Testament'),
}

SECTIONS = {
    'Easter': ('Àjíǹde', 'Pâques'), 'Palm Sunday': ('Ọjọ́ Ọ̀pẹ', 'Rameaux'), 'Mercy & Passion Week': ('Àánú àti Ọ̀sẹ̀ Ìrékọjá', 'Miséricorde et Semaine sainte'),
    'Holy Spirit': ('Ẹ̀mí Mímọ́', 'Saint-Esprit'), 'Spiritual Power': ('Agbára', 'Puissance spirituelle'), 'Good News': ('Ìhìnrere', 'Bonne nouvelle'),
    'Praise': ('Ìyìn', 'Louange'), 'Glory': ('Ògo', 'Gloire'), 'Joy': ('Ayọ̀', 'Joie'), 'Thanksgiving': ('Ọpẹ́', 'Action de grâce'),
    'Blessing': ('Ìbùkún', 'Bénédiction'), 'Harvest': ('Ìkórè', 'Moisson'), 'Victory': ('Ìṣẹ́gun', 'Victoire'), 'Healing': ('Ìwòsàn', 'Guérison'),
    'Baptism': ('Ìrìbọmi', 'Baptême'), 'Faith': ('Ìgbàgbọ́', 'Foi'), 'Judgement': ('Ìdájọ́', 'Jugement'), 'God’s Work': ('Iṣẹ́ Olúwa', 'L’œuvre de Dieu'),
    'Warning': ('Ìkìlọ̀', 'Avertissement'), 'Burial & Remembrance': ('Ìsìnkú àti Ìrántí', 'Funérailles et souvenir'),
    'Call to Heaven': ('Ìpè sí Òkè Ọ̀run', 'Appel au ciel'), 'Revelation': ('Ìfihàn', 'Révélation'), 'Sanctification': ('Ìyàsímímọ́', 'Sanctification'),
    'House Opening & Dedication': ('Ìyàsímímọ́ Ilé', 'Ouverture et dédicace de maison'), 'Divine Love': ('Ìfẹ́ Àìṣẹ̀tàn', 'Amour divin'),
    'Holy Reunion': ('Ìpàdé Mímọ́', 'Sainte réunion'), 'Holy Communion': ('Ìdàpọ̀ Ara Olúwa', 'Sainte Communion'), 'Wedding': ('Ìgbéyàwó', 'Mariage'),
    'Prayer': ('Àdúrà', 'Prière'), 'Protection & Journey': ('Ààbò àti Ìrìn Àjò', 'Protection et voyage'), 'Children': ('Ọmọdé', 'Enfants'),
    'Birth of Christ': ('Ìbí Kírísítì', 'Naissance du Christ'), 'Seeking God’s Favour': ('Ìwojú Olúwa', 'Rechercher la faveur de Dieu'),
    'Promise': ('Ìlérí', 'Promesse'), 'Praise & Worship': ('Ìdúpẹ́ àti Ìyìn', 'Louange et adoration'),
}

CATEGORIES = {
    'Forgiveness of Sins': ('Ìdáríjì Ẹ̀ṣẹ̀', 'Pardon des péchés'), 'Processional / Opening': ('Ìwọ́de / Ìbẹ̀rẹ̀', 'Procession / ouverture'),
    'Lighting of Candles': ('Títan Àbẹ́là', 'Allumage des cierges'), 'Sanctification': ('Ìsọdimímọ́', 'Sanctification'),
    'Thanksgiving': ('Ọpẹ́', 'Action de grâce'), 'Praise & Glory': ('Ìyìn àti Ògo', 'Louange et gloire'),
    'Holy Spirit / Spiritual Power': ('Ẹ̀mí Mímọ́ / Agbára Ẹ̀mí', 'Saint-Esprit / puissance spirituelle'), 'Mercy & Blessing': ('Àánú àti Ìbùkún', 'Miséricorde et bénédiction'),
    'Recessional / Closing': ('Ìjáde / Ìparí', 'Sortie / clôture'), 'Evangelism': ('Ìtànkálẹ̀ Ìhìnrere', 'Évangélisation'), 'Faith & Trust': ('Ìgbàgbọ́ àti Ìgbẹ́kẹ̀lé', 'Foi et confiance'),
    'Healing': ('Ìwòsàn', 'Guérison'), 'Christ the King': ('Kírísítì Ọba', 'Christ Roi'),
    'hymns': ('orin', 'cantiques'), 'Both': ('Méjèèjì', 'Les deux'),
}


def main():
    merged = {**BOOKS, **SECTIONS, **CATEGORIES}
    # Where a section and a category share an English name, the section reading wins only in the hymn list; both are right
    for i, lang in enumerate(('yo', 'fr')):
        p = ROOT / 'public' / 'i18n' / f'{lang}.json'
        cat = json.loads(p.read_text(encoding='utf-8'))
        for k, v in merged.items():
            cat[k] = v[i]
        p.write_text(json.dumps(dict(sorted(cat.items())), ensure_ascii=False, indent=0) + '\n', encoding='utf-8', newline='\n')
        print(lang, len(cat))


if __name__ == '__main__':
    main()
