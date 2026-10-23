import json, os
d = "c:/Users/RLG/Downloads/CCC Live/public/data"

print("=== DATA FILES ===")
for f in sorted(os.listdir(d)):
    if f.endswith('.json'):
        print(f"  {f}: {os.path.getsize(os.path.join(d,f))/1024:.1f}KB")

print("\n=== BIBLE YO ===")
yo = os.path.join(d, "bible", "yo")
if os.path.exists(yo):
    files = sorted(os.listdir(yo))
    print(f"  {len(files)} book files")
    if files:
        print(f"  Sample: {files[:5]}")
        # Check Genesis structure
        gen = json.load(open(os.path.join(yo, "Genesis.json"), encoding="utf-8"))
        ch1 = gen["chapters"][0]
        print(f"  Genesis ch1 verses: {len(ch1['verses'])}")
        print(f"  First verse: {ch1['verses'][0]['text'][:80]}...")
else:
    print("  DIRECTORY NOT FOUND")

print("\n=== HYMNS ===")
h = json.load(open(os.path.join(d, "hymns.json"), encoding="utf-8"))
print(f"  Total: {len(h)}")
v = h[0].get("verses", [])
print(f"  Hymn 1 verses: {len(v)}")
if v:
    print(f"  V1 english_lines: {v[0].get('english_lines', [])[:2]}")
    print(f"  V1 yoruba_lines: {v[0].get('yoruba_lines', [])[:2]}")
with_review = sum(1 for x in h if x.get("needs_verse_split_review"))
print(f"  Needs verse split review: {with_review}")

print("\n=== SERVICES ===")
s = json.load(open(os.path.join(d, "services.json"), encoding="utf-8"))
print(f"  Total services: {len(s)}")
print(f"  Service IDs: {[x['id'] for x in s]}")
sr_count = sum(1 for svc in s for st in svc.get("steps", []) if st.get("scripture_references"))
tl_count = sum(1 for svc in s for st in svc.get("steps", []) if st.get("text_lines"))
print(f"  Steps with scripture_references: {sr_count}")
print(f"  Steps with text_lines: {tl_count}")

print("\n=== CONSTITUTION ===")
c = json.load(open(os.path.join(d, "constitution.json"), encoding="utf-8"))
print(f"  Meta title: {c.get('meta', {}).get('title', '?')}")
sections = c.get("sections", [])
print(f"  Sections: {len(sections)}")
for sec in sections:
    clauses = sec.get("clauses", [])
    print(f"    {sec['id']}: {sec['title']} ({len(clauses)} clauses)" if clauses else f"    {sec['id']}: {sec['title']} (narrative)")
