import json, os

downloads = r"c:\Users\RLG\Downloads"

# Check what source files exist
print("=== SOURCE FILES ===")
for f in os.listdir(downloads):
    if f.startswith("ccc_") and f.endswith(".json"):
        path = os.path.join(downloads, f)
        size = os.path.getsize(path) / 1024
        print(f"  {f} ({size:.1f} KB)")

# Inspect hymns
print("\n=== HYMNS ===")
try:
    with open(os.path.join(downloads, "ccc_hymns_digitized.json"), "r", encoding="utf-8") as f:
        hymns = json.load(f)
    print(f"Type: {type(hymns).__name__}, Count: {len(hymns)}")
    if isinstance(hymns, dict):
        keys = list(hymns.keys())[:3]
        print(f"First keys: {keys}")
        first = hymns[keys[0]]
        print(f"First entry keys: {list(first.keys()) if isinstance(first, dict) else 'not dict'}")
        print(json.dumps(first, indent=2, ensure_ascii=False)[:2000])
except Exception as e:
    print(f"Error: {e}")

# Inspect services
print("\n=== SERVICES ===")
try:
    with open(os.path.join(downloads, "ccc_order_of_service_digitized.json"), "r", encoding="utf-8") as f:
        services = json.load(f)
    print(f"Type: {type(services).__name__}")
    if isinstance(services, dict):
        keys = list(services.keys())[:3]
        print(f"Keys ({len(services)}): {list(services.keys())}")
        first_key = keys[0]
        entry = services[first_key]
        print(f"First entry type: {type(entry).__name__}")
        if isinstance(entry, dict):
            print(f"First entry keys: {list(entry.keys())}")
        elif isinstance(entry, list):
            print(f"First entry length: {len(entry)}")
            if entry:
                print(f"First step keys: {list(entry[0].keys()) if isinstance(entry[0], dict) else 'n/a'}")
                print(json.dumps(entry[0], indent=2, ensure_ascii=False)[:1000])
    elif isinstance(services, list):
        print(f"Array length: {len(services)}")
except Exception as e:
    print(f"Error: {e}")

# Check for constitution
print("\n=== CONSTITUTION ===")
const_path = os.path.join(downloads, "ccc_constitution_digitized.json")
if os.path.exists(const_path):
    with open(const_path, "r", encoding="utf-8") as f:
        const = json.load(f)
    print(f"Type: {type(const).__name__}, Count: {len(const)}")
    if isinstance(const, dict):
        print(f"Keys: {list(const.keys())[:10]}")
    elif isinstance(const, list):
        print(f"First entry: {json.dumps(const[0], indent=2, ensure_ascii=False)[:500]}")
else:
    print("NOT FOUND")

# Check for bible files
print("\n=== BIBLE FILES ===")
for name in ["ccc_bible_kjv_english.json", "ccc_bible_yoruba_oycb.json"]:
    path = os.path.join(downloads, name)
    if os.path.exists(path):
        size = os.path.getsize(path) / (1024*1024)
        print(f"  {name} ({size:.1f} MB)")
    else:
        print(f"  {name}: NOT FOUND")
