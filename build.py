#!/usr/bin/env python3
"""
בונה את אתר Shasi מתוך content/ אל התיקייה site/.
אין צורך בהתקנות — רק Python 3.

הוספת מאמר חדש:
  1. העתק קובץ קיים מ-content/articles/ ושנה את הנתונים בראשו (בין השורות ---).
  2. כתוב את גוף המאמר ב-HTML מתחת לשורת --- השנייה.
  3. הרץ:  python3 build.py
"""
import html
import json
import re
import shutil
from datetime import date
from pathlib import Path

# ---------- הגדרות: עדכן כאן ----------
SITE_URL = "https://shasi.co.il"  # הדומיין הסופי, בלי / בסוף
SITE_NAME = "Shasi"
APP_STORE_URL = "https://apps.apple.com/us/app/shasi/id6799770868"
PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.shasi.app"
CONTACT_EMAIL = "shasi.contact@gmail.com"
# ----------------------------------------

ROOT = Path(__file__).parent
CONTENT = ROOT / "content" / "articles"
STATIC = ROOT / "static"
OUT = ROOT / "site"

HEB_MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי",
              "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"]


def heb_date(iso):
    d = date.fromisoformat(iso)
    return f"{d.day} ב{HEB_MONTHS[d.month - 1]} {d.year}"


def esc(s):
    return html.escape(s, quote=True)


def parse_article(path):
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", text, re.S)
    if not m:
        raise SystemExit(f"חסר בלוק נתונים בראש הקובץ: {path}")
    meta = json.loads(m.group(1))
    meta["body"] = m.group(2).strip()
    meta.setdefault("updated", meta["date"])
    meta.setdefault("faq", [])
    meta.setdefault("related", [])
    return meta


def store_buttons(extra_class=""):
    return f"""<div class="stores {extra_class}">
  <a class="store" href="{APP_STORE_URL}" rel="noopener">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.3 1.2 9.7.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.5-1-2.5-3.8zM14 5.5c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4z"/></svg>
    <span><small>הורידו מ-</small>App Store</span>
  </a>
  <a class="store" href="{PLAY_STORE_URL}" rel="noopener">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3.6 2.3c-.3.3-.4.7-.4 1.2v17c0 .5.1.9.4 1.2l9.5-9.7-9.5-9.7zm10.6 10.8 2.7 2.8-11.4 6.5c-.3.2-.7.2-1 .1l9.7-9.4zm0-2.2L4.5 1.5c.3-.1.7-.1 1 .1l11.4 6.5-2.7 2.8zm3.9-1.6 3 1.7c.9.5.9 1.4 0 1.9l-3 1.7-3-3 3-2.3z"/></svg>
    <span><small>הורידו מ-</small>Google Play</span>
  </a>
</div>"""


def cta_box(title="רוצים שמישהו יזכור את זה בשבילכם?",
            text="Shasi שולחת תזכורת לפני כל טיפול, טסט וחידוש ביטוח, לפי מספר הרישוי של הרכב שלכם. חינם."):
    return f"""<aside class="cta">
  <div class="cta-text">
    <strong>{title}</strong>
    <p>{text}</p>
  </div>
  {store_buttons("compact")}
</aside>"""


def layout(title, description, path, body, extra_head="", og_type="website"):
    url = SITE_URL + path
    return f"""<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(description)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="{og_type}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(description)}">
<meta property="og:url" content="{url}">
<meta property="og:locale" content="he_IL">
<meta property="og:site_name" content="{SITE_NAME}">
<meta name="theme-color" content="#f9f9f9">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
{extra_head}
</head>
<body>
<header class="topbar">
  <div class="wrap topbar-inner">
    <a class="brand" href="/" aria-label="Shasi – דף הבית">
      <img src="/logo.png" alt="" width="36" height="36"><span>SHASI</span>
    </a>
    <nav>
      <a href="/blog">מדריכים</a>
      <a href="/about">על Shasi</a>
      <a class="nav-cta" href="/#download">הורדה חינם</a>
    </nav>
  </div>
</header>
<main>
{body}
</main>
<footer class="footer">
  <div class="wrap footer-inner">
    <div>
      <a class="brand" href="/"><img src="/logo.png" alt="" width="32" height="32"><span>SHASI</span></a>
      <p>תזכורות לטיפולים, טסט וביטוח – לפי מספר הרישוי.</p>
    </div>
    <nav>
      <a href="/blog">מדריכים</a>
      <a href="/about">על Shasi</a>
      <a href="/privacy">מדיניות פרטיות</a>
      <a href="mailto:{CONTACT_EMAIL}">צור קשר</a>
    </nav>
  </div>
  <p class="wrap fineprint">המידע באתר הוא כללי ואינו מחליף את הוראות היצרן, משרד התחבורה או מוסך מורשה. © {date.today().year} Shasi</p>
</footer>
</body>
</html>
"""


def article_card(a):
    return f"""<a class="card" href="/blog/{a['slug']}">
  <span class="tag">{esc(a.get('tag', 'מדריך'))}</span>
  <h3>{esc(a['title'])}</h3>
  <p>{esc(a['description'])}</p>
  <span class="more">לקריאה ←</span>
</a>"""


def render_article(a, by_slug):
    path = f"/blog/{a['slug']}"
    # תיבת ה-CTA מוחלפת במקום הסימון <!--CTA-->
    body = a["body"].replace("<!--CTA-->", cta_box())

    faq_html = ""
    faq_ld = ""
    if a["faq"]:
        items = "\n".join(
            f"<details><summary>{esc(q['q'])}</summary><p>{q['a']}</p></details>"
            for q in a["faq"])
        faq_html = f'<section class="faq"><h2>שאלות נפוצות</h2>{items}</section>'
        faq_ld = json.dumps({
            "@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": q["q"],
                            "acceptedAnswer": {"@type": "Answer",
                                               "text": re.sub("<[^>]+>", "", q["a"])}}
                           for q in a["faq"]]}, ensure_ascii=False)

    related = [by_slug[s] for s in a["related"] if s in by_slug]
    related_html = ""
    if related:
        related_html = ('<section class="related"><h2>עוד מדריכים</h2><div class="grid">'
                        + "".join(article_card(r) for r in related) + "</div></section>")

    article_ld = json.dumps({
        "@context": "https://schema.org", "@type": "Article",
        "headline": a["title"], "description": a["description"],
        "datePublished": a["date"], "dateModified": a["updated"],
        "inLanguage": "he-IL", "mainEntityOfPage": SITE_URL + path,
        "publisher": {"@type": "Organization", "name": SITE_NAME}}, ensure_ascii=False)

    head = f'<script type="application/ld+json">{article_ld}</script>'
    if faq_ld:
        head += f'\n<script type="application/ld+json">{faq_ld}</script>'

    content = f"""<article class="article wrap narrow">
  <nav class="crumbs"><a href="/">ראשי</a> / <a href="/blog">מדריכים</a></nav>
  <span class="tag">{esc(a.get('tag', 'מדריך'))}</span>
  <h1>{esc(a['title'])}</h1>
  <p class="meta">עודכן: {heb_date(a['updated'])} · {esc(a.get('read', '5'))} דקות קריאה</p>
  <div class="prose">
{body}
  </div>
  {faq_html}
  {cta_box("Shasi – לא לפספס אף טיפול", "מכניסים מספר רישוי ומקבלים לוח טיפולים מותאם לדגם, ותזכורות לטסט ולביטוח לפני שהם פגים.")}
  {related_html}
</article>"""
    return layout(f"{a['title']} | {SITE_NAME}", a["description"], path, content, head, "article")


def render_home(articles):
    cards = "".join(article_card(a) for a in articles[:6])
    body = f"""<section class="hero">
  <div class="wrap hero-inner">
    <div class="hero-text">
      <div class="wordmark"><img src="/logo.png" alt="" width="72" height="72"><span>SHASI</span></div>
      <h1>כל מה שהרכב שלכם צריך,<br><em>באפליקציה אחת</em></h1>
      <p class="lead">מכניסים מספר רישוי, ו-Shasi בונה לוח טיפולים מותאם לדגם שלכם ושולחת תזכורת לפני כל טיפול, טסט וחידוש ביטוח.</p>
      <div id="download">{store_buttons()}</div>
      <p class="hero-note">חינם · לכל רכב בישראל · הנתונים ממאגר משרד התחבורה</p>
    </div>
    <div class="phones" aria-hidden="true">
      <div class="phone back"><img src="/app-plate.jpg" alt="" loading="eager"></div>
      <div class="phone front"><img src="/app-dashboard.jpg" alt="מסך הרכב באפליקציית Shasi: טסט, ביטוח, צמיגים, מצבר ולוח טיפולים" loading="eager"></div>
    </div>
  </div>
</section>

<section class="showcase wrap">
  <div class="show-row">
    <div class="show-text">
      <span class="step">1</span>
      <h2>מכניסים מספר רישוי</h2>
      <p>בלי להקליד דגם, שנה ומנוע. Shasi מושכת את פרטי הרכב ממאגר משרד התחבורה ומזהה בדיוק איזה רכב יש לכם.</p>
    </div>
    <div class="phone"><img src="/app-plate.jpg" alt="מסך הזנת מספר רישוי באפליקציית Shasi" loading="lazy"></div>
  </div>
  <div class="show-row reverse">
    <div class="show-text">
      <span class="step">2</span>
      <h2>כל המועדים במסך אחד</h2>
      <p>כמה ימים נשארו לטסט ולביטוח, מתי הוחלפו הצמיגים והמצבר, ומה הטיפול הבא. ירוק זה בסדר, אדום זה הזמן לטפל.</p>
    </div>
    <div class="phone"><img src="/app-dashboard.jpg" alt="מסך הרכב באפליקציית Shasi" loading="lazy"></div>
  </div>
  <div class="show-row">
    <div class="show-text">
      <span class="step">3</span>
      <h2>לוח טיפולים מותאם לרכב</h2>
      <p>שמן, נוזל קירור, רצועות ותיבת הילוכים, כל אחד עם דד-ליין לפי ק"מ ולפי זמן. אפשר לעדכן ולהתאים לפי מה שהמוסך אמר.</p>
    </div>
    <div class="phone"><img src="/app-schedule.jpg" alt="לוח הטיפולים באפליקציית Shasi" loading="lazy"></div>
  </div>
</section>

<section class="wrap latest">
  <div class="section-head">
    <h2>מדריכים לבעלי רכב</h2>
    <a href="/blog">לכל המדריכים ←</a>
  </div>
  <div class="grid">{cards}</div>
</section>
"""
    ld = json.dumps({"@context": "https://schema.org", "@type": "MobileApplication",
                     "name": SITE_NAME, "operatingSystem": "iOS, Android",
                     "applicationCategory": "UtilitiesApplication",
                     "offers": {"@type": "Offer", "price": "0", "priceCurrency": "ILS"}},
                    ensure_ascii=False)
    return layout("Shasi – תזכורות לטיפולים, טסט וביטוח לפי מספר רישוי",
                  "אפליקציה חינמית לניהול הרכב: לוח טיפולים מותאם לדגם לפי מספר רישוי, ותזכורות לטסט ולביטוח.",
                  "/", body, f'<script type="application/ld+json">{ld}</script>')


def render_blog(articles):
    cards = "".join(article_card(a) for a in articles)
    body = f"""<section class="wrap page-head">
  <h1>מדריכים לבעלי רכב</h1>
  <p class="lead">תשובות ברורות לשאלות על טיפולים, טסט ותחזוקה – בלי ז׳רגון של מוסכים.</p>
</section>
<section class="wrap"><div class="grid">{cards}</div></section>"""
    return layout(f"מדריכים לבעלי רכב | {SITE_NAME}",
                  "מדריכים על טיפולים, טסט ותחזוקת רכב: מה עושים כשהרכב לא עובר טסט, מתי מחליפים רצועת טיימינג ועוד.",
                  "/blog", body)


def render_about():
    body = f"""<section class="wrap narrow page-head">
  <h1>על Shasi</h1>
  <div class="prose">
    <p>Shasi נולדה מתוך תסכול פשוט: כמעט כל בעל רכב שכח פעם טיפול, גילה שהטסט פג רק כשעצר אותו שוטר, או שילם יותר על ביטוח כי לא השווה בזמן.</p>
    <p>האפליקציה עושה דבר אחד וטוב: מכניסים מספר רישוי, והיא בונה לוח טיפולים מותאם לדגם ושולחת תזכורת לפני כל מועד חשוב – טיפול, טסט, ביטוח. היא חינמית לשימוש.</p>
    <p>במדריכים באתר אנחנו מסבירים בשפה פשוטה את מה שכל בעל רכב צריך לדעת. המידע כללי, ובכל מקרה של ספק כדאי לבדוק בספר הרכב, אצל היבואן או במוסך מורשה.</p>
    <p>שאלות, הצעות או שיתופי פעולה: <a href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a></p>
  </div>
  {cta_box()}
</section>"""
    return layout(f"על Shasi | {SITE_NAME}", "מי אנחנו ומה Shasi עושה: תזכורות לטיפולים, טסט וביטוח לפי מספר רישוי.", "/about", body)


def render_privacy():
    updated = heb_date(date.today().isoformat())
    body = f"""<section class="wrap narrow page-head">
  <h1>מדיניות פרטיות</h1>
  <div class="prose">
    <p class="note">מדיניות זו מנוסחת בלשון זכר מטעמי נוחות בלבד ופונה לכל המגדרים. היא נכתבה כדי לשקף בשקיפות את האופן שבו Shasi אוספת ומשתמשת במידע, אך אינה מהווה ייעוץ משפטי – לפני הסתמכות משפטית עליה (למשל במחלוקת מול משתמש או רגולטור) מומלץ להעביר אותה לבדיקת עורך דין המתמחה בפרטיות ובדיני מאגרי מידע.</p>
    <p class="meta">עודכן לאחרונה: {updated}</p>

    <h2>1. כללי</h2>
    <p>מדיניות פרטיות זו חלה על אפליקציית Shasi ועל אתר האינטרנט shasi.co.il ("השירות"), המופעלים על ידי Shasi ("אנחנו"). המדיניות מסבירה אילו נתונים אנחנו אוספים, לשם מה, עם מי הם משותפים, וכיצד אפשר לממש זכויות ביחס אליהם. שימוש בשירות מהווה הסכמה לתנאי מדיניות זו.</p>

    <h2>2. אילו נתונים אנחנו אוספים</h2>
    <ul>
      <li><strong>פרטי הרשמה והתחברות:</strong> כתובת אימייל, ובמידה ונרשמתם דרך Apple או Google – מזהה חשבון שמועבר אלינו מאותו ספק, בהתאם להרשאות שאישרתם מולו. אנחנו לא רואים ולא שומרים את הסיסמה שלכם בשירותי ההתחברות החיצוניים.</li>
      <li><strong>מספר רישוי ונתוני הרכב:</strong> מספר הרישוי שהזנתם, ופרטי הרכב שנשלפים לפיו ממאגר משרד התחבורה (gov.il) – יצרן, דגם, שנתון, תאריך טסט ועוד – לצורך בניית לוח טיפולים מותאם ושליחת תזכורות.</li>
      <li><strong>נתונים שאתם מזינים ידנית:</strong> קילומטראז׳, טיפולים שבוצעו ומחירם (אם בחרתם לתעד מחיר), תאריכי ביטוח, ופרטים נוספים שהוספתם לרכב בגראז׳ שלכם באפליקציה.</li>
      <li><strong>נתוני שיתוף רכב:</strong> אם הזמנתם משתמש נוסף לשתף רכב, אנחנו שומרים את כתובת האימייל שהזמנתם ואת הסטטוס של ההזמנה.</li>
      <li><strong>טפסי פנייה מרצון:</strong> אם מילאתם טופס לקבלת הצעת מחיר (לדוגמה ביטוח או טרייד-אין), אנחנו אוספים את הפרטים שמילאתם בו – לרוב שם מלא, טלפון, מספר רישוי ופרטי הרכב – ואת אישורכם המפורש (checkbox הסכמה) להעברתם לגורם הרלוונטי.</li>
      <li><strong>נתוני התראות:</strong> אם אישרתם קבלת התראות Push, אנחנו שומרים מזהה מכשיר טכני (לא את תוכן המכשיר) כדי לשלוח תזכורות על טיפולים, טסט וביטוח קרובים.</li>
      <li><strong>נתוני שימוש טכניים:</strong> זמן כניסה אחרון לשירות, אירועי שימוש בסיסיים (כגון יצירת לוח טיפולים), וקליקים אנונימיים על מוצרים מומלצים – לצורך תחזוקת השירות ושיפורו. קליקים על מוצרים מומלצים אינם משויכים לזהות המשתמש הספציפי.</li>
      <li><strong>עוגיות באתר (shasi.co.il):</strong> האתר משתמש בעוגיות טכניות בסיסיות ובגופנים חיצוניים (Google Fonts) לצורך תצוגה תקינה. לא מופעל באתר מעקב פרסומי.</li>
    </ul>

    <h2>3. לשם מה אנחנו משתמשים במידע</h2>
    <ul>
      <li>בניית לוח טיפולים מותאם לרכב שלכם, ושליחת תזכורות לפני טיפול, טסט וחידוש ביטוח.</li>
      <li>אפשור שיתוף רכב בין משתמשים, לפי בקשתכם המפורשת.</li>
      <li>מענה לפניות תמיכה ולשאלות שהפניתם אלינו.</li>
      <li>כאשר ביקשתם זאת במפורש בטופס פנייה – העברת פרטיכם לגורם המקצועי הרלוונטי (למשל סוכן ביטוח) כדי שיחזור אליכם בהצעת מחיר.</li>
      <li>שיפור השירות, איתור תקלות, ומניעת שימוש לרעה באפליקציה.</li>
    </ul>

    <h2>4. עם מי המידע משותף</h2>
    <p>איננו מוכרים מידע אישי לאף גורם. מידע מועבר לצדדים הבאים, רק ככל שנדרש להפעלת השירות:</p>
    <ul>
      <li><strong>ספקי תשתית:</strong> מסד הנתונים והאחסון שלנו מופעלים על ידי Supabase, ושליחת התראות Push מתבצעת דרך OneSignal. ספקים אלו מעבדים את המידע מטעמנו ובהתאם להוראותינו בלבד, ואינם רשאים להשתמש בו למטרות משלהם.</li>
      <li><strong>בינה מלאכותית ליצירת לוח טיפולים:</strong> בניית לוח הטיפולים המותאם מתבצעת באמצעות מודל AI של Google (Gemini), שאליו מועברים פרטי הרכב (יצרן, דגם, שנתון) לצורך יצירת ההמלצה – ללא פרטים מזהים אישיים כמו שם או אימייל.</li>
      <li><strong>מאגר משרד התחבורה (gov.il):</strong> כאשר אתם מזינים מספר רישוי, אנחנו שולפים את נתוני הרכב הציבוריים מהמאגר הממשלתי הפתוח לצורך כך.</li>
      <li><strong>גורמים מקצועיים שבחרתם לפנות אליהם:</strong> רק אם מילאתם טופס לידים (כגון ביטוח או טרייד-אין) ואישרתם זאת – פרטיכם מועברים לגורם הספציפי שמתואר בטופס, לצורך יצירת קשר מולכם.</li>
      <li><strong>רשויות, כאשר נדרש בחוק:</strong> במקרה של דרישה חוקית תקפה מרשות מוסמכת.</li>
    </ul>

    <h2>5. העברת מידע אל מחוץ לישראל</h2>
    <p>חלק מספקי התשתית שלנו (כגון Supabase ו-OneSignal) עשויים לאחסן או לעבד מידע בשרתים מחוץ לישראל, כולל במדינות החברות באיחוד האירופי או בארצות הברית. במקרים אלו אנו פועלים מול ספקים שמחויבים להסכמי עיבוד נתונים ולסטנדרטים מקובלים להגנת מידע.</p>

    <h2>6. אבטחת מידע</h2>
    <p>אנחנו נוקטים באמצעי אבטחה מקובלים – לרבות הצפנת תעבורה (HTTPS), בקרת הרשאות גישה למסד הנתונים, והפרדה בין משתמשים ברמת בסיס הנתונים – כדי להגן על המידע מפני גישה, שימוש או חשיפה בלתי מורשים. עם זאת, אין אפשרות להבטיח אבטחה מוחלטת באינטרנט, ואנו ממליצים לא לשתף את פרטי ההתחברות שלכם עם אחרים.</p>

    <h2>7. תקופת שמירת המידע</h2>
    <p>אנחנו שומרים את המידע כל עוד החשבון שלכם פעיל, ולתקופה נוספת לאחר מכן ככל שנדרש למטרות חוקיות, ליישוב מחלוקות או לאכיפת תנאי השימוש. בעת מחיקת חשבון, המידע האישי המזהה נמחק או הופך לאנונימי בתוך פרק זמן סביר, למעט מידע שחובה לשמור על פי דין.</p>

    <h2>8. זכויות המשתמש</h2>
    <p>בהתאם לחוק הגנת הפרטיות, תשמ"א-1981, כל משתמש רשאי:</p>
    <ul>
      <li>לעיין במידע שנשמר עליו אצלנו.</li>
      <li>לבקש לתקן מידע שגוי או לא מעודכן.</li>
      <li>לבקש למחוק את חשבונו ואת המידע הנלווה אליו.</li>
      <li>להתנגד לשימוש במידע למטרות שאינן הפעלת השירות עצמו, ולבטל בכל עת את הסכמתו לקבלת פניות משיווק של גורמים חיצוניים (כגון הצעות ביטוח).</li>
    </ul>
    <p>לכל בקשה כאמור, אפשר לפנות אלינו בכתובת <a href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a>. נשתדל להשיב בתוך זמן סביר ולא יאוחר מהקבוע בדין.</p>

    <h2>9. קטינים</h2>
    <p>השירות מיועד למשתמשים בגיל 18 ומעלה (בעלי רישיון נהיגה ורכב). איננו אוספים ביודעין מידע מקטינים, ואם נודע לנו כי נאסף מידע כאמור, נפעל למחיקתו.</p>

    <h2>10. שינויים במדיניות</h2>
    <p>אנחנו עשויים לעדכן מדיניות זו מעת לעת, בין היתר בעקבות שינויים בשירות או בדין. נעדכן את תאריך "עודכן לאחרונה" בראש העמוד, ובמקרה של שינוי מהותי נשתדל להודיע למשתמשים הרשומים באפליקציה.</p>

    <h2>11. יצירת קשר</h2>
    <p>לשאלות, בקשות או תלונות בנוגע לפרטיות: <a href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a></p>
  </div>
</section>"""
    return layout(f"מדיניות פרטיות | {SITE_NAME}", "מדיניות הפרטיות של Shasi: אילו נתונים נאספים, למה משתמשים בהם, עם מי הם משותפים וכיצד לממש את זכויותיכם.", "/privacy", body)


def render_404():
    body = """<section class="wrap narrow page-head center">
  <h1>הדף לא נמצא</h1>
  <p class="lead">אולי חיפשתם את אחד המדריכים?</p>
  <p><a class="btn" href="/blog">למדריכים</a></p>
</section>"""
    return layout("הדף לא נמצא | Shasi", "הדף לא נמצא.", "/404", body)


def write(rel, content):
    p = OUT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    for f in STATIC.iterdir():
        shutil.copy(f, OUT / f.name)

    articles = [parse_article(p) for p in sorted(CONTENT.glob("*.html"))]
    articles.sort(key=lambda a: a["date"], reverse=True)
    by_slug = {a["slug"]: a for a in articles}

    write("index.html", render_home(articles))
    write("blog/index.html", render_blog(articles))
    write("about/index.html", render_about())
    write("privacy/index.html", render_privacy())
    write("404.html", render_404())
    for a in articles:
        write(f"blog/{a['slug']}/index.html", render_article(a, by_slug))

    today = date.today().isoformat()
    urls = [("/", today), ("/blog", today), ("/about", today), ("/privacy", today)]
    urls += [(f"/blog/{a['slug']}", a["updated"]) for a in articles]
    sm = "".join(f"<url><loc>{SITE_URL}{u}</loc><lastmod>{d}</lastmod></url>" for u, d in urls)
    write("sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?>\n'
                         f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{sm}</urlset>\n')
    write("robots.txt", f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n")
    print(f"נבנו {len(articles)} מאמרים אל {OUT}")


if __name__ == "__main__":
    main()
