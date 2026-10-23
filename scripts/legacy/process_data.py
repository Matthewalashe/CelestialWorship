import json
import re
import csv
import urllib.request
import os

input_dir = r"c:\Users\RLG\Downloads"
output_dir = r"c:\Users\RLG\Downloads\CCC Live\public\data"
os.makedirs(output_dir, exist_ok=True)
os.makedirs(os.path.join(output_dir, "bible", "en"), exist_ok=True)

def strip_page_artifacts(text):
    if not isinstance(text, str): return text
    text = re.sub(r'[\x00-\x1F\x7F]', '', text) # non printable chars
    text = re.sub(r'', '', text) # replacement char
    text = re.sub(r'CCC Holy Saviour Parish 2017\s*-\s*\d+\s*-', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Hymns\s+\d+\s*-\s*\d+\s*are reserved', '', text, flags=re.IGNORECASE)
    return text.strip()

# Task 1: Clean Hymns
try:
    with open(os.path.join(input_dir, "ccc_hymns_digitized.json"), "r", encoding="utf-8", errors="replace") as f:
        hymns_raw = json.load(f)
        
    hymns_out = []
    
    # solfa notations patterns
    solfa_pattern = re.compile(r'([dmsflrt]\s*[:;]\s*)+', re.IGNORECASE)

    for num_key, h_data in hymns_raw.items():
        if not h_data: continue
        
        # normalize categories
        cat = h_data.get("suggested_categories", h_data.get("categories", []))
        if isinstance(cat, list):
            cat_list = []
            for c in cat:
                c_lower = c.lower()
                norm = c_lower
                mapping = {
                    "forgiveness": "forgiveness_of_sins",
                    "processional": "processional_or_opening",
                    "opening": "processional_or_opening",
                    "lighting": "lighting_of_candles",
                    "sanctification": "sanctification",
                    "thanksgiving": "thanksgiving",
                    "praise": "praise_or_glory",
                    "glory": "praise_or_glory",
                    "holy spirit": "holy_spirit_or_power",
                    "power": "holy_spirit_or_power",
                    "mercy": "mercy_or_blessing",
                    "blessing": "mercy_or_blessing",
                    "recessional": "recessional_or_closing",
                    "closing": "recessional_or_closing",
                    "evangelism": "evangelism",
                    "faith": "faith_and_trust",
                    "healing": "healing",
                    "christ the king": "christ_the_king"
                }
                for k, v in mapping.items():
                    if k in c_lower:
                        norm = v
                        break
                cat_list.append(norm)
            norm_cat = cat_list[0] if cat_list else "recessional_or_closing" # single string requested in output maybe? Or array?
            # Instructions: "Rename suggested_categories to categories". Output example implied single string or array? 
            # I will just keep it as a string or whatever mapping requires. Wait, instructions said "category names", let's use the list but remapped, wait, the prompt says: "hymnSlot: { category: 'forgiveness_of_sins' }", wait, "normalize category values to these exact strings". Let's provide a list of normalized strings.
            norm_categories_output = list(set(cat_list))
        else:
            norm_categories_output = []
            
        # Clean lyrics
        yl = strip_page_artifacts(h_data.get("yoruba_lyrics", ""))
        el = strip_page_artifacts(h_data.get("english_lyrics", ""))
        yt = strip_page_artifacts(h_data.get("yoruba_title", ""))
        et = strip_page_artifacts(h_data.get("english_title", ""))
        
        # extract solfa
        solfa = None
        # naive extraction
        solfa_match = re.search(r'([dmsflrt][\:\.]\s*){2,}', yl + " " + el, re.IGNORECASE)
        if solfa_match:
            solfa = solfa_match.group(0).strip()
            yl = yl.replace(solfa, "").strip()
            el = el.replace(solfa, "").strip()
            
        hymns_out.append({
            "number": h_data.get("number", num_key),
            "yoruba_title": yt,
            "english_title": et,
            "yoruba_lyrics": yl,
            "english_lyrics": el,
            "categories": norm_categories_output,
            "needs_clergy_review": bool(h_data.get("needs_clergy_review", False)),
            "solfa_notation": solfa
        })

    with open(os.path.join(output_dir, "hymns.json"), "w", encoding="utf-8") as f:
        json.dump(hymns_out, f, indent=2, ensure_ascii=False)
except Exception as e:
    print(f"Error Task 1: {e}")

# Task 2: Clean Order of Service
try:
    with open(os.path.join(input_dir, "ccc_order_of_service_digitized.json"), "r", encoding="utf-8", errors="replace") as f:
        services_raw = json.load(f)

    services_meta = {
        "morning_service": {"displayName": "Morning Service", "day": "Daily", "time": "6:00 AM", "description": "Daily morning congregational and household prayer service"},
        "seekers_service": {"displayName": "Seekers Service", "day": "Wednesday", "time": "9:00 AM", "description": ""},
        "mercy_day_service": {"displayName": "Mercy Day Service", "day": "Wednesday", "time": "6:00 PM", "description": ""},
        "power_day_service": {"displayName": "Power Day Service", "day": "Friday", "time": "6:00 PM", "description": ""},
        "evening_service_lords_day": {"displayName": "Evening Service", "day": "Sunday", "time": "6:00 PM", "description": ""},
        "prophets_prophetess_dreamers": {"displayName": "Prophets & Prophetesses", "day": "Friday", "time": "12:00 PM", "description": ""},
        "pregnant_women": {"displayName": "Pregnant Women Service", "day": "Wednesday", "time": "varies", "description": ""},
        "lords_day_service": {"displayName": "Lord's Day Service", "day": "Sunday", "time": "10:00 AM", "description": ""},
        "new_moon": {"displayName": "New Moon Service", "day": "Monthly (1st Thursday)", "time": "10:00 PM", "description": ""},
        "baby_christening": {"displayName": "Baby Christening", "day": "As scheduled", "time": "varies", "description": ""},
        "birthday": {"displayName": "Birthday Service", "day": "As scheduled", "time": "varies", "description": ""},
        "holy_matrimony": {"displayName": "Holy Matrimony", "day": "As scheduled", "time": "varies", "description": ""},
        "laying_foundation_stone": {"displayName": "Foundation Stone Laying", "day": "As scheduled", "time": "varies", "description": ""},
        "private_house_dedication": {"displayName": "House Dedication", "day": "As scheduled", "time": "varies", "description": ""},
        "church_dedication": {"displayName": "Church Dedication", "day": "As scheduled", "time": "varies", "description": ""},
        "baptism": {"displayName": "Baptism Service", "day": "As scheduled", "time": "varies", "description": ""},
        "washing_feet_communion": {"displayName": "Washing of Feet & Communion", "day": "Holy Week", "time": "varies", "description": ""},
        "christian_wake": {"displayName": "Christian Wake", "day": "As scheduled", "time": "varies", "description": ""},
        "burial": {"displayName": "Burial Service", "day": "As scheduled", "time": "varies", "description": ""},
        "remembrance": {"displayName": "Remembrance Service", "day": "As scheduled", "time": "varies", "description": ""},
        "end_of_year": {"displayName": "End of Year Service", "day": "December 31", "time": "10:00 PM", "description": ""}
    }

    services_out = []
    
    def parse_hymn_slot(text):
        lower = text.lower()
        if "forgiveness of sin" in lower: return {"category": "forgiveness_of_sins"}
        if "thanksgiving" in lower: return {"category": "thanksgiving"}
        if "praise or glory" in lower: return {"category": "praise_or_glory"}
        if "holy spirit" in lower or "spiritual power" in lower: return {"category": "holy_spirit_or_power"}
        if "mercy or blessing" in lower or "covenant or blessing" in lower: return {"category": "mercy_or_blessing"}
        if "sanctification" in lower: return {"category": "sanctification"}
        if "evangelism" in lower: return {"category": "evangelism"}
        if "882 or 878" in lower: return {"fixedHymnNumber": 882}
        
        match = re.search(r'hymn\s*(\d+)', lower)
        if match: return {"fixedHymnNumber": int(match.group(1))}
        
        if "closing hymn" in lower: return {"category": "recessional_or_closing"}
        if "recessional hymn" in lower: return {"category": "recessional_or_closing"}
        if "processional hymn" in lower: return {"category": "processional_or_opening"}
        if "hymn:" in lower or "hymn -" in lower:
            return {"category": "recessional_or_closing"} # fallback
        return None

    def get_type(text):
        lower = text.lower()
        if "hymn" in lower: return "hymn"
        if "prayer" in lower: return "prayer"
        if "lesson" in lower or "psalm" in lower: return "scripture"
        return "instruction"

    for s_id, raw_steps in services_raw.items():
        meta = services_meta.get(s_id, {"displayName": s_id.replace("_", " ").title(), "day": "", "time": "", "description": ""})
        out_steps = []
        if isinstance(raw_steps, dict) and "steps" in raw_steps:
            raw_steps = raw_steps["steps"]
            
        for step in raw_steps:
            text = strip_page_artifacts(step.get("text", ""))
            if not text: continue
            step_num = step.get("step") if "step" in step else step.get("stepNumber")
            is_header = step_num is None
            
            s_obj = {
                "stepNumber": step_num,
                "text": text,
                "type": get_type(text),
                "hymnSlot": parse_hymn_slot(text),
                "scriptureRef": None
            }
            if is_header:
                s_obj["isHeader"] = True
            out_steps.append(s_obj)
            
        services_out.append({
            "id": s_id,
            "displayName": meta["displayName"],
            "day": meta["day"],
            "time": meta["time"],
            "description": meta["description"],
            "steps": out_steps
        })

    with open(os.path.join(output_dir, "services.json"), "w", encoding="utf-8") as f:
        json.dump(services_out, f, indent=2, ensure_ascii=False)
except Exception as e:
    print(f"Error Task 2: {e}")

# Task 3: Lessons
try:
    lessons_out = []
    with open(os.path.join(input_dir, "2026_bible_lessons.csv"), "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            def parse_ref(ref_str):
                if not ref_str or not ref_str.strip(): return None
                ref_str = ref_str.strip()
                # e.g., 2 Corinthians 1:1-11
                match = re.search(r'^(\d*\s*[A-Za-z\s]+?)\s+(\d+)\s*[:\.]\s*(\d+)\s*-\s*(\d+)', ref_str)
                if match:
                    return {
                        "raw": ref_str,
                        "book": match.group(1).strip(),
                        "chapter": int(match.group(2)),
                        "verseStart": int(match.group(3)),
                        "verseEnd": int(match.group(4))
                    }
                # e.g. Isaiah 40:1
                match2 = re.search(r'^(\d*\s*[A-Za-z\s]+?)\s+(\d+)\s*[:\.]\s*(\d+)', ref_str)
                if match2:
                    return {
                        "raw": ref_str,
                        "book": match2.group(1).strip(),
                        "chapter": int(match2.group(2)),
                        "verseStart": int(match2.group(3)),
                        "verseEnd": int(match2.group(3))
                    }
                return {"raw": ref_str, "book": ref_str, "chapter": 1, "verseStart": 1, "verseEnd": 1}
            
            d = row.get("Date", "")
            d2 = d.split("T")[0] if "T" in d else d
            lessons_out.append({
                "date": d2 or row.get("\ufeffDate", ""),
                "day": row.get("Day", ""),
                "time": row.get("Time", ""),
                "occasion": row.get("Occasion", ""),
                "firstLesson": parse_ref(row.get("First_Lesson")),
                "secondLesson": parse_ref(row.get("Second_Lesson"))
            })
            
    with open(os.path.join(output_dir, "lessons.json"), "w", encoding="utf-8") as f:
        json.dump(lessons_out, f, indent=2, ensure_ascii=False)
except Exception as e:
    print(f"Error Task 3: {e}")

print("Python tasks done.")
