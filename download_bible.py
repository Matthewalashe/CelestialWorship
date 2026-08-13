import os
import json
import urllib.request
import time

books = [
    ("Genesis", "Gen", 50, "OT"),
    ("Exodus", "Exo", 40, "OT"),
    ("Leviticus", "Lev", 27, "OT"),
    ("Numbers", "Num", 36, "OT"),
    ("Deuteronomy", "Deu", 34, "OT"),
    ("Joshua", "Jos", 24, "OT"),
    ("Judges", "Jdg", 21, "OT"),
    ("Ruth", "Rut", 4, "OT"),
    ("1 Samuel", "1Sa", 31, "OT"),
    ("2 Samuel", "2Sa", 24, "OT"),
    ("1 Kings", "1Ki", 22, "OT"),
    ("2 Kings", "2Ki", 25, "OT"),
    ("1 Chronicles", "1Ch", 29, "OT"),
    ("2 Chronicles", "2Ch", 36, "OT"),
    ("Ezra", "Ezr", 10, "OT"),
    ("Nehemiah", "Neh", 13, "OT"),
    ("Esther", "Est", 10, "OT"),
    ("Job", "Job", 42, "OT"),
    ("Psalms", "Psa", 150, "OT"),
    ("Proverbs", "Pro", 31, "OT"),
    ("Ecclesiastes", "Ecc", 12, "OT"),
    ("Song of Solomon", "Sng", 8, "OT"),
    ("Isaiah", "Isa", 66, "OT"),
    ("Jeremiah", "Jer", 52, "OT"),
    ("Lamentations", "Lam", 5, "OT"),
    ("Ezekiel", "Eze", 48, "OT"),
    ("Daniel", "Dan", 12, "OT"),
    ("Hosea", "Hos", 14, "OT"),
    ("Joel", "Joe", 3, "OT"),
    ("Amos", "Amo", 9, "OT"),
    ("Obadiah", "Oba", 1, "OT"),
    ("Jonah", "Jon", 4, "OT"),
    ("Micah", "Mic", 7, "OT"),
    ("Nahum", "Nah", 3, "OT"),
    ("Habakkuk", "Hab", 3, "OT"),
    ("Zephaniah", "Zep", 3, "OT"),
    ("Haggai", "Hag", 2, "OT"),
    ("Zechariah", "Zec", 14, "OT"),
    ("Malachi", "Mal", 4, "OT"),
    ("Matthew", "Mat", 28, "NT"),
    ("Mark", "Mar", 16, "NT"),
    ("Luke", "Luk", 24, "NT"),
    ("John", "Joh", 21, "NT"),
    ("Acts", "Act", 28, "NT"),
    ("Romans", "Rom", 16, "NT"),
    ("1 Corinthians", "1Co", 16, "NT"),
    ("2 Corinthians", "2Co", 13, "NT"),
    ("Galatians", "Gal", 6, "NT"),
    ("Ephesians", "Eph", 6, "NT"),
    ("Philippians", "Php", 4, "NT"),
    ("Colossians", "Col", 4, "NT"),
    ("1 Thessalonians", "1Th", 5, "NT"),
    ("2 Thessalonians", "2Th", 3, "NT"),
    ("1 Timothy", "1Ti", 6, "NT"),
    ("2 Timothy", "2Ti", 4, "NT"),
    ("Titus", "Tit", 3, "NT"),
    ("Philemon", "Phm", 1, "NT"),
    ("Hebrews", "Heb", 13, "NT"),
    ("James", "Jas", 5, "NT"),
    ("1 Peter", "1Pe", 5, "NT"),
    ("2 Peter", "2Pe", 3, "NT"),
    ("1 John", "1Jo", 5, "NT"),
    ("2 John", "2Jo", 1, "NT"),
    ("3 John", "3Jo", 1, "NT"),
    ("Jude", "Jud", 1, "NT"),
    ("Revelation", "Rev", 22, "NT")
]

output_dir = r"c:\Users\RLG\Downloads\CCC Live\public\data\bible\en"
base_url = "https://raw.githubusercontent.com/aruljohn/Bible-kjv/master/"

books_json = []

for name, abbr, chapters, testament in books:
    # Remove spaces for URL since repo has files like "1Samuel.json"
    url_name = name.replace(" ", "")
    url = f"{base_url}{url_name}.json"
    
    # We want to save it as original name per requirements: "Filenames at the source are like Genesis.json, Exodus.json... Keep the same filenames." Actually, user said keep same filenames as source. Since source is 1Samuel.json, I'll save as 1Samuel.json? No, user implied "keep the same filenames (like Genesis.json)". I'll use the URL name. But let's actually just stick to the name with spaces if they prefer it, or the source name. I'll save as what they actually are in the source to be safe, wait, actually I will name them with the standard `name.json` but remove spaces just to match the source filename.
    file_path = os.path.join(output_dir, f"{name}.json") 
    
    books_json.append({
        "name": name,
        "abbreviation": abbr,
        "chapterCount": chapters,
        "testament": testament
    })
    
    if not os.path.exists(file_path):
        try:
            urllib.request.urlretrieve(url, file_path)
            print(f"Downloaded {name}.json")
            time.sleep(0.05)
        except Exception as e:
            print(f"Failed to download {name}: {e}")

with open(r"c:\Users\RLG\Downloads\CCC Live\public\data\bible\books.json", "w", encoding="utf-8") as f:
    json.dump(books_json, f, indent=2)

print("Bible downloads complete.")
