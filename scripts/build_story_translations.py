"""Write the translated children's Bible stories (data-src/stories_i18n/batch*.json) to public/data/stories/<lang>/.

    python -I -X utf8 scripts/build_story_translations.py

Each translation must have as many paragraphs and questions as the English story, so a picture or a question
never lands beside the wrong text. Quoted Scripture follows the Yorùbá Bible and Louis Segond.
"""
import json
import pathlib

import sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from undash import undash_all  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'data-src' / 'stories_i18n'
OUT = ROOT / 'public' / 'data' / 'stories'


def main():
    total = 0
    for batch in sorted(SRC.glob('batch*.json')):
        for sid, langs in json.loads(batch.read_text(encoding='utf-8')).items():
            en = json.loads((OUT / f'{sid}.json').read_text(encoding='utf-8'))
            for lang, t in langs.items():
                for part in ('paragraphs', 'questions'):
                    if len(t[part]) != len(en[part]):
                        raise SystemExit(f'{batch.name} {sid} {lang}: {len(t[part])} {part}, the English has {len(en[part])}')
                (OUT / lang).mkdir(exist_ok=True)
                (OUT / lang / f'{sid}.json').write_text(
                    json.dumps(undash_all({'id': sid, **t}), ensure_ascii=False, separators=(',', ':')), encoding='utf-8', newline='\n')
                total += 1
    print(total, 'translated stories written')


if __name__ == '__main__':
    main()
