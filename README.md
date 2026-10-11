# אתר Shasi

אתר סטטי בעברית: דף בית, מדריכים לבעלי רכב, "על Shasi" ומדיניות פרטיות.
אין תלות בחבילות – רק Python 3.

## לפני ההעלאה – לעדכן פעם אחת

בראש `build.py`:
- `SITE_URL` – הדומיין שלך
- `APP_STORE_URL`, `PLAY_STORE_URL` – הקישורים לאפליקציה
- `CONTACT_EMAIL` – כתובת ליצירת קשר

צבעים: בראש `static/style.css` (המשתנים `--brand`, `--brand-dark`, `--accent`).
לוגו: `static/favicon.svg` – אפשר להחליף בלוגו של Shasi (באותו שם קובץ).

## בנייה מקומית

```
python3 build.py
python3 -m http.server -d site 8000
```
ואז לפתוח http://localhost:8000

## העלאה ל-Vercel

1. להעלות את התיקייה לריפו בגיטהאב.
2. ב-Vercel: Add New → Project → לבחור את הריפו → Deploy.
   ההגדרות כבר ב-`vercel.json`, אין מה לשנות.
3. Settings → Domains → להוסיף את הדומיין.
4. ב-Google Search Console: להוסיף את הדומיין ולהגיש את `https://הדומיין/sitemap.xml`.

## הוספת מאמר

1. להעתיק קובץ מ-`content/articles/` לשם חדש.
2. לעדכן את הנתונים בראש הקובץ: `slug` (כתובת באנגלית), `title`, `description`, `date`, `faq`, `related`.
3. לכתוב את הגוף ב-HTML. `<!--CTA-->` מוסיף את תיבת ההורדה של Shasi באותו מקום.
4. `git push` – Vercel יבנה ויעלה אוטומטית.
