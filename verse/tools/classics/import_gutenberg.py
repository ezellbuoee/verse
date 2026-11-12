#!/usr/bin/env python3
"""
Builds the production seed (public-domain poems) from Project Gutenberg plain-text editions.

  python3 tools/classics/import_gutenberg.py --cache <dir> [--out server/src/main/resources/seed/classics.json]

Every poem becomes one post (author id "classic:<slug>", source note with the edition). Poems of three lines or
fewer become quotes. The server loads the file into an empty database at startup (verse.seed.classics).
"""
import argparse, json, os, re, sys, urllib.request

ROMAN = re.compile(r'^(?=[MDCLXVI])M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})\.?$')
MAX_CHARS = 6000          # longer pieces (narrative poems) are skipped
QUOTE_MAX_LINES = 3

# One entry per volume. start/end are regexes on single lines; parsing happens between the first match of
# `start` (exclusive) and the first match of `end` (exclusive) inside the Gutenberg body.
BOOKS = [
 dict(id=1041, slug="shakespeare", author="William Shakespeare", life="1564–1616", edition="Shakespeare's Sonnets, 1609 (Project Gutenberg #1041)",
      start=r'^by William Shakespeare', numbered="Sonnet"),
 dict(id=12242, slug="dickinson", author="Emily Dickinson", life="1830–1886", edition="Poems by Emily Dickinson, Three Series, 1890–1896 (Project Gutenberg #12242)",
      start=r'^I\. LIFE\.\s*$', start_exclusive=True),
 dict(id=1322, slug="whitman", author="Walt Whitman", life="1819–1892", edition="Leaves of Grass, 1891–92 edition (Project Gutenberg #1322)",
      start=r'^BOOK I\.', start_exclusive=True, numbers_continue=True),
 dict(id=574, slug="blake", author="William Blake", life="1757–1827", edition="Poems of William Blake, 1874 (Project Gutenberg #574)",
      start=r'^\s*SONGS OF INNOCENCE\s*$', end=r'^\s*APPENDIX\s*$'),
 dict(id=23684, slug="keats", author="John Keats", life="1795–1821", edition="Poems Published in 1820 (Project Gutenberg #23684)", start=r'^\s*ADVERTISEMENT\.?\s*$', end=r'^\s*NOTES\.?\s*$', numbers_continue=True),
 dict(id=8209, slug="keats", author="John Keats", life="1795–1821", edition="Poems, 1817 (Project Gutenberg #8209)", start=r'^\s*DEDICATION\.?\s*$', numbers_continue=True),
 dict(id=38877, slug="yeats", author="W. B. Yeats", life="1865–1939", edition="Poems, 1895/1899 (Project Gutenberg #38877)", start=r'^\s*THE ROSE\s*$', start_exclusive=True, numbers_continue=True),
 dict(id=32233, slug="yeats", author="W. B. Yeats", life="1865–1939", edition="The Wind Among the Reeds, 1899 (Project Gutenberg #32233)", numbers_continue=True, start=r'^THE HOSTING OF THE SIDHE\s*$', end=r'^\s*NOTES\s*$'),
 dict(id=30652, slug="yeats", author="W. B. Yeats", life="1865–1939", edition="In the Seven Woods, 1903 (Project Gutenberg #30652)", numbers_continue=True, start=(r'^\s*IN THE SEVEN WOODS\s*$', 3)),
 dict(id=30488, slug="yeats", author="W. B. Yeats", life="1865–1939", edition="The Green Helmet and Other Poems, 1910 (Project Gutenberg #30488)", numbers_continue=True, start=r'^HIS DREAM\s*$'),
 dict(id=36865, slug="yeats", author="W. B. Yeats", life="1865–1939", edition="Responsibilities, and Other Poems, 1916 (Project Gutenberg #36865)", numbers_continue=True, start=r'^THE GREY ROCK\s*$', end=r'^\s*NOTES\s*$'),
 dict(id=32491, slug="yeats", author="W. B. Yeats", life="1865–1939", edition="The Wild Swans at Coole, 1919 (Project Gutenberg #32491)", numbers_continue=True, start=(r'^THE WILD SWANS AT COOLE\s*$', 2)),
 dict(id=7164, slug="tagore", author="Rabindranath Tagore", life="1861–1941", edition="Gitanjali, 1912, the poet's own English versions (Project Gutenberg #7164)", numbered="Gitanjali"),
 dict(id=6686, slug="tagore", author="Rabindranath Tagore", life="1861–1941", edition="The Gardener, 1913 (Project Gutenberg #6686)", start=r'^\s*1\s*$', numbered="The Gardener"),
 dict(id=6520, slug="tagore", author="Rabindranath Tagore", life="1861–1941", edition="The Crescent Moon, 1913 (Project Gutenberg #6520)", start=(r'^\s*THE HOME\s*$', 3)),
 dict(id=6522, slug="tagore", author="Rabindranath Tagore", life="1861–1941", edition="Fruit-Gathering, 1916 (Project Gutenberg #6522)", numbered="Fruit-Gathering"),
 dict(id=6524, slug="tagore", author="Rabindranath Tagore", life="1861–1941", edition="Stray Birds, 1916 (Project Gutenberg #6524)", start=r'^\s*1\s*$', numbered="Stray Birds"),
 dict(id=18338, slug="dunbar", author="Paul Laurence Dunbar", life="1872–1906", edition="The Complete Poems of Paul Laurence Dunbar, 1913 (Project Gutenberg #18338)", start=r'^ERE SLEEP COMES DOWN TO SOOTHE THE WEARY EYES\s*$'),
 dict(id=400, slug="teasdale", author="Sara Teasdale", life="1884–1933", edition="Helen of Troy, and Other Poems, 1911 (Project Gutenberg #400)", start=(r'^Helen of Troy\s*$', 2)),
 dict(id=596, slug="teasdale", author="Sara Teasdale", life="1884–1933", edition="Rivers to the Sea, 1915 (Project Gutenberg #596)", start=r'^\s*A PRAYER\s*$'),
 dict(id=442, slug="teasdale", author="Sara Teasdale", life="1884–1933", edition="Love Songs, 1917 (Project Gutenberg #442)", start=(r'^\s*Barter\s*$', 2)),
 dict(id=591, slug="teasdale", author="Sara Teasdale", life="1884–1933", edition="Flame and Shadow, 1920 (Project Gutenberg #591)", start=(r'^\s*Blue Squills\s*$', 2)),
 dict(id=69866, slug="teasdale", author="Sara Teasdale", life="1884–1933", edition="Dark of the Moon, 1926 (Project Gutenberg #69866)", start=r'^_On the Sussex Downs_\s*$'),
 dict(id=19188, slug="rossetti", author="Christina Rossetti", life="1830–1894", edition="Poems, 1906 collected edition (Project Gutenberg #19188)", start=r'^\s*GOBLIN MARKET\.\s*$'),
 dict(id=1279, slug="burns", author="Robert Burns", life="1759–1796", edition="Poems and Songs of Robert Burns, 1759–1796 (Project Gutenberg #1279)", start=r'^Song.Handsome Nell'),
 dict(id=246, slug="khayyam", author="Omar Khayyam", life="1048–1131", edition="The Rubáiyát of Omar Khayyám, Edward FitzGerald's first version, 1859 (Project Gutenberg #246)", start=r'^First Edition\s*$', end=r'^Fifth Edition\s*$', numbered="Quatrain"),
]

def fetch(book, cache):
    path = os.path.join(cache, f"{book['id']}.txt")
    if not os.path.exists(path):
        url = f"https://www.gutenberg.org/ebooks/{book['id']}.txt.utf-8"
        with urllib.request.urlopen(url, timeout=60) as r, open(path, "wb") as f:
            f.write(r.read())
    return open(path, encoding="utf-8", errors="replace").read()

def body_of(text):
    m = re.search(r'\*\*\* START OF [^\n]*\*\*\*', text)
    e = re.search(r'\*\*\* END OF [^\n]*\*\*\*', text)
    return text[m.end() if m else 0 : e.start() if e else len(text)]

def roman_to_int(s):
    s = s.rstrip('.').upper(); vals = dict(M=1000, D=500, C=100, L=50, X=10, V=5, I=1); total = 0
    for i, c in enumerate(s):
        v = vals[c]
        total += -v if i + 1 < len(s) and vals[s[i + 1]] > v else v
    return total

def is_caps(t):
    letters = [c for c in t if c.isalpha()]
    return len(letters) >= 2 and all(c.isupper() for c in letters)

def looks_like_title(line, prev_blank, cfg, next_blank=True):
    t = line.strip().strip('_')
    if not t or len(t) > (120 if is_caps(t) else 70):
        return False
    if ROMAN.match(t) or re.match(r'^\d+\.?$', t):
        return True
    if not next_blank:
        return False
    if ROMAN.match(t) or re.match(r'^\d+\.?$', t):
        return True
    if prev_blank >= 2 and not t.endswith((',', ';', ':', '--')) and not t[0].islower() and not t.startswith(('(', '[', '"', '\u201c')):
        return True
    return False

def is_prose(stanzas):
    lines = [x.strip() for st in stanzas for x in st if x.strip()]
    if len(lines) < 4:
        return False
    lens = [len(x) for x in lines]
    mean = sum(lens) / len(lens)
    var = sum((l - mean) ** 2 for l in lens) / len(lens)
    return mean > 52 and var ** 0.5 < 9

def parse(text, cfg):
    body = body_of(text)
    lines = body.split('\n')
    # window
    start = 0; end = len(lines)
    if cfg.get("start"):
        pat, nth = (cfg["start"], 1) if isinstance(cfg["start"], str) else cfg["start"]
        seen = 0
        for i, l in enumerate(lines):
            if re.search(pat, l):
                seen += 1
                if seen == nth:
                    start = i + 1 if cfg.get("start_exclusive") else i; break
    if cfg.get("end"):
        for i in range(start, len(lines)):
            if re.search(cfg["end"], lines[i]):
                end = i; break
    lines = [l.rstrip() for l in lines[start:end]]
    # skip a table of contents: a paragraph of 6+ short heading-like lines
    out_lines = []; para = []
    def flush_para():
        nonlocal para
        if len(para) >= 6 and all(len(x.strip()) <= 60 and x.strip() and not x.strip()[0].islower() for x in para) \
                and sum(1 for x in para if x.strip()[-1] in '.,;:!?') <= len(para) * 0.2:
            para = []  # contents block dropped
        out_lines.extend(para); para = []
    for l in lines:
        if l.strip():
            para.append(l)
        else:
            flush_para(); out_lines.append(l)
    flush_para(); lines = out_lines
    # drop bracketed editor notes ("[Published in ...]", "[Footnote 1: ...]", "[Illustration]") and footnote markers
    cleaned = []; in_note = False
    for l in lines:
        t = l.strip()
        if in_note:
            if ']' in t: in_note = False
            continue
        if t.startswith('[') :
            if ']' not in t: in_note = True
            continue
        if re.match(r'^\s*(Tune|Air)\s*[—\-:]', t):
            continue  # Burns: the melody a song goes to, not a line of it
        cleaned.append(re.sub(r'\^\d+', '', l))
    lines = cleaned
    poems = []; title = None; stanzas = []; cur = []; blank = 2  # the window starts at a heading
    def flush():
        nonlocal title, stanzas, cur
        if cur: stanzas.append(cur); cur = []
        if title is not None and stanzas:
            poems.append((title, stanzas))
        title = None; stanzas = []
    for li, l in enumerate(lines):
        if not l.strip():
            blank += 1
            if cur: stanzas.append(cur); cur = []
            continue
        next_blank = li + 1 >= len(lines) or not lines[li + 1].strip()
        t0 = l.strip().strip('_')
        caps_subtitle = title is not None and not stanzas and not cur and is_caps(t0) and len(t0) <= 120 and next_blank and not (ROMAN.match(t0) or re.match(r'^\d+\.?$', t0))
        if (looks_like_title(l, blank, cfg, next_blank) or caps_subtitle) and not cur:
            t = t0
            numeric = bool(ROMAN.match(t) or re.match(r'^\d+\.?$', t))
            if re.match(r'^\d{4}$', t):
                blank = 0
                continue  # a year heading between poems (Burns)
            if title is not None and not stanzas and is_caps(t) and not numeric:
                title = t  # "I." then "SUCCESS.": the caps line is the real title
            elif numeric and cfg.get("numbers_continue") and title is not None and not (ROMAN.match(title) or re.match(r'^\d+\.?$', title)):
                blank = 0
                continue  # a numbered section inside the current poem (Whitman, Keats, Yeats)
            elif title is not None and not stanzas and not numeric and not is_caps(t):
                cur.append(l)  # a title is waiting for its poem: this short line is its first verse, not a new title
            else:
                flush(); title = t
        else:
            if title is None and cfg.get("untitled_ok"):
                title = ""
            cur.append(l)
        blank = 0
    flush()
    out = []
    for i, (t, stanzas) in enumerate(poems):
        text_lines = [re.sub(r'\s+$', '', x) for s in stanzas for x in (s + [''])]
        text_lines = [re.sub(r'^\s{1,8}', lambda m: '' if len(m.group(0)) <= 4 else '    ', x) for x in text_lines]
        body_text = '\n'.join(text_lines).strip()
        nlines = len([x for x in body_text.split('\n') if x.strip()])
        if nlines < 1 or len(body_text) > MAX_CHARS:
            continue
        if is_prose(stanzas):
            continue
        # a short piece that ends in an attribution ("...to pray."—Pope.) is an epigraph, not a poem
        if nlines <= QUOTE_MAX_LINES and re.search(r'[—\-]\s*[A-Z][A-Za-z. ]{1,30}\.?\s*$', body_text):
            continue
        tt = t.strip().rstrip('.').strip()
        low = tt.lower()
        if low.startswith(('produced by', 'contents', 'preface', 'introduction', 'dedication', 'advertisement', 'note on', 'books by', 'by the same',
                           'part ', 'book ', 'new york', 'london', 'copyright', 'the macmillan', 'page', 'printed')) \
                or low in ('by', 'to', 'poems', 'songs', 'notes', 'index', 'page') or low.startswith('note') or 'gutenberg' in low or 'transcriber' in low or 'original html' in low:
            continue
        if is_caps(tt):
            tt = tt.title().replace("'S ", "'s ").replace("’S ", "’s ")
        if ROMAN.match(t) or re.match(r'^\d+\.?$', t):
            n = roman_to_int(t) if ROMAN.match(t) else int(t.rstrip('.'))
            tt = f"{cfg['numbered']} {n}" if cfg.get("numbered") else ""
        out.append(dict(title=tt, body=body_text, lines=nlines))
    return out

MOOD_WORDS = {
    "LOVE": ["love", "lover", "kiss", "heart", "beloved", "sweetheart", "bride", "my dear", "luve"],
    "GRIEF": ["grief", "grave", "death", "dead", "die", "dying", "mourn", "sorrow", "tears", "weep", "tomb", "farewell", "alas"],
    "JOY": ["joy", "laugh", "merry", "glad", "delight", "sing", "dance", "happy", "bliss", "mirth", "cheer"],
    "NATURE": ["tree", "flower", "river", "sea", "wind", "rain", "leaf", "leaves", "bird", "garden", "hill", "snow", "spring", "summer", "autumn", "winter", "grass", "rose", "sun"],
    "HOPE": ["hope", "dream", "faith", "pray", "heaven", "light", "dawn", "morning", "free", "soul", "peace"],
    "NIGHT": ["night", "moon", "star", "stars", "dark", "sleep", "midnight", "evening", "shadow", "twilight"],
}

def guess_mood(title, body):
    text = f" {(title or '')} {body} ".lower()
    text = re.sub(r"[^a-z' ]", " ", text)
    best, score = None, 0
    for mood, words in MOOD_WORDS.items():
        n = sum(text.count(f" {w} ") + text.count(f" {w}s ") for w in words)
        if n > score:
            best, score = mood, n
    return best if score >= 2 else None

def is_shouting(body):
    letters = [c for c in body if c.isalpha()]
    return len(letters) >= 3 and sum(1 for c in letters if c.isupper()) / len(letters) >= 0.8


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--cache", required=True); ap.add_argument("--out"); ap.add_argument("--report", action="store_true"); ap.add_argument("--dump")
    a = ap.parse_args()
    allposts = []
    for b in BOOKS:
        poems = parse(fetch(b, a.cache), b)
        quotes = sum(1 for p in poems if p["lines"] <= QUOTE_MAX_LINES)
        avg = sum(p["lines"] for p in poems) / max(1, len(poems))
        print(f"{b['id']:>6} {b['slug']:<12} {len(poems):>4} pieces ({quotes} quotes), avg {avg:4.1f} lines | " + " / ".join(p['title'][:28] or '(untitled)' for p in poems[:4]))
        for p in poems:
            if is_shouting(p["body"]):  # running heads, editor names, section titles in capitals
                continue
            src = f"{b['author']} ({b['life']}). {b['edition']}. Public domain."
            allposts.append(dict(kind="QUOTE" if p["lines"] <= QUOTE_MAX_LINES else "POEM", title=p["title"] or None, body=p["body"], author=b["author"], slug=b["slug"], source=src, mood=guess_mood(p["title"], p["body"])))
    if a.dump:
        import random
        random.seed(7)
        with open(a.dump, "w", encoding="utf-8") as f:
            by = {}
            for p in allposts: by.setdefault(p["slug"] + " | " + p["source"][-40:], []).append(p)
            for k, ps in by.items():
                f.write(f"\n===== {k}: {len(ps)} pieces\n")
                for p in random.sample(ps, min(3, len(ps))):
                    f.write(f"--- [{p['kind']}] {p['title']!r} ({len(p['body'].splitlines())} lines)\n" + "\n".join(p["body"].splitlines()[:5]) + "\n")
    moods = {}
    for p in allposts: moods[p["mood"]] = moods.get(p["mood"], 0) + 1
    print(f"TOTAL {len(allposts)} pieces, {sum(1 for p in allposts if p['kind']=='QUOTE')} quotes, {len({p['slug'] for p in allposts})} poets, moods {moods}")
    if a.out:
        posts = []
        for p in allposts:
            post = {"kind": p["kind"], "title": p["title"], "body": p["body"], "source": p["source"], "mood": p["mood"],
                    "authorName": p["author"], "authorId": f"classic:{p['slug']}"}
            posts.append({k: v for k, v in post.items() if v is not None})
        with open(a.out, "w", encoding="utf-8") as f:
            json.dump(posts, f, ensure_ascii=False, separators=(",", ":"))
        print(f"wrote {len(posts)} posts to {a.out}")

if __name__ == "__main__":
    main()
