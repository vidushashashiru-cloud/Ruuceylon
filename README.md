# Ruu Ceylon - Showroom Website

ආයුර්වේද සෞඛ්‍ය හා රූපලාවණ්‍ය නිෂ්පාදන සඳහා showroom වෙබ් අඩවිය. සිංහල සහ English දෙකම ඇත. Phone එකටත් computer එකටත් ගැලපේ.

**ගොනු වෙනස් කළ පසු Vercel විසින් ඉබේම site එක අලුත් කරයි (විනාඩි 1ක් පමණ).**

---

## 1. GitHub එකට දාන හැටි

1. https://github.com හි **New repository** එකක් හදන්න (නම: `ruuceylon-site`).
2. **uploading an existing file** ඔබා, මේ folder එකේ ඇති සියල්ල drag කරන්න.
3. **වැදගත්:** GitHub වෙබ් එකෙන් එක වරකට ගොනු 100ක් පමණක් upload කළ හැක. ඒ නිසා:
   - පළමුව `images/products` folder එකේ photos (76) upload කරන්න → **Commit changes**
   - ඉන්පසු ඉතිරි සියල්ල (index.html, admin.html, css, js, data, api, images/slides, images/logo*.png, vercel.json, package.json) upload කරන්න → **Commit changes**
   - (GitHub Desktop භාවිතා කරන්නේ නම් එකවර සියල්ල push කළ හැක.)
4. `index.html` එක repository එකේ **මුලම තැනේ** (root) තිබිය යුතුයි.

## 2. Vercel එකට deploy කරන හැටි

1. https://vercel.com → **Add New → Project** → ඔබේ GitHub repository එක **Import** කරන්න.
2. Framework Preset: **Other** (වෙනත් කිසිවක් වෙනස් නොකර) → **Deploy**.
3. විනාඩියකින් `https://ඔබේ-නම.vercel.app` ලැබේ.

## 3. Comments වැඩ කරවන හැටි (එක් වරක් පමණක්)

Comments සේව් වෙන්න නොමිලේ database එකක් ඕනේ.

1. Vercel project එකේ **Storage** tab → **Upstash (Redis)** තෝරා, free plan එකෙන් හදන්න → project එකට **Connect** කරන්න. (Vercel විසින් අවශ්‍ය variables ඉබේම එකතු කරයි.)
2. **Settings → Environment Variables** වලට මේවා එකතු කරන්න:
   - `ADMIN_PASSWORD` = ඔබට ඕන රහස් password එකක් (admin page එකට)
   - `AUTO_APPROVE` = `true` (අවශ්‍ය නම් පමණයි. මෙය දැමුවොත් අදහස් එවූ ගමන් පෙනේ. නොදැමුවොත් ඔබ අනුමත කළ පසුව පමණක් පෙනේ - spam වළක්වාගන්න මෙය හොඳයි.)
3. **Deployments → ⋯ → Redeploy** කරන්න.

**Admin page:** `https://ඔබේ-site/admin` → password එක දී අදහස් **අනුමත කරන්න / සඟවන්න / මකන්න** පුළුවන්.

> Database එක සම්බන්ධ කරන තුරු, අදහසක් ලියූ විට එය ඒ ලියූ කෙනාගේ phone/browser එකේ පමණක් සේව් වේ (test කරන්න පමණයි).

---

## 4. ඕනම දෙයක් වෙනස් කරන හැටි

GitHub හි ගොනුව ඇරලා **පැන්සල (✏️) icon** එක ඔබන්න → වෙනස් කරන්න → **Commit changes**. ටික වෙලාවකින් site එකේ පෙනේ.

### මිල / විස්තර / නිෂ්පාදන - `data/products.json`

```json
{
  "id": "collagen-offer",
  "name": "Collagen offer",
  "price": 5000,
  "oldPrice": null,
  "category": "offers",
  "desc": { "si": "සිංහල විස්තරය", "en": "English description" },
  "image": "images/products/03_Collagen_offer.jpg",
  "badge": { "si": "විශේෂ දීමනා", "en": "Special offer" },
  "inStock": true,
  "hidden": false,
  "feedbacks": []
}
```

- **මිල වෙනස් කිරීම:** `"price": 5000`
- **කැපූ මිල පෙන්වීම:** `"oldPrice": 7990`
- **නිෂ්පාදනය සඟවන්න:** `"hidden": true`
- **තොග නැත කියා පෙන්වන්න:** `"inStock": false`
- **අලුත් නිෂ්පාදනයක්:** තියෙන block එකක් copy කර අලුත් `id` එකක් දෙන්න (ඉංග්‍රීසි කුඩා අකුරු, ඉලක්කම්, `-` පමණයි; අනිත් ඒවාට වඩා වෙනස් විය යුතුයි). Photo එක `images/products` ට upload කර `image` හි නම දෙන්න.
- **Category:** `offers, supplements, herbal, skin, hair, drinks, soap, premium`

### නිෂ්පාදනයට ගනුදෙනුකරුවන්ගේ අදහස් (ඔබ විසින් එක් කරන) - `feedbacks`

```json
"feedbacks": [
  {
    "name": "නිමාලි, කොළඹ",
    "rating": 5,
    "text": { "si": "ඉතා හොඳ නිෂ්පාදනයක්!", "en": "Very good product!" },
    "date": "2026-10-20"
  }
]
```

(ඇත්තටම ලැබුණු අදහස් පමණක් දාන්න.)

### Slideshow / සම්මාන ඡායාරූප - `data/site.json` → `slides`

1. සම්මාන photos `images/awards/` folder එකට upload කරන්න (උදා: `award-1.jpg`).
2. `slides.items` ට මෙසේ එකතු කරන්න:

```json
{
  "image": "images/awards/award-1.jpg",
  "title": { "si": "සම්මානයේ නම", "en": "Award name" },
  "caption": { "si": "කෙටි විස්තරයක්", "en": "Short note" },
  "label": { "si": "සම්මානය", "en": "Award" }
}
```

3. `slides.title` එක `"සම්මාන"` / `"Our awards"` ලෙස වෙනස් කරන්න. අවශ්‍ය නැති දීමනා slides මකන්න.
4. Photo එකට ගැලපෙන නිෂ්පාදනයක් තිබේ නම් `"product": "product-id"` එකතු කළ හැක (photo එක ඔබද්දී ඒ නිෂ්පාදනය විවෘත වේ).

### අනිත් දේවල් - `data/site.json`

- දුරකථන / WhatsApp (`94` වලින් පටන්ගන්න, මුල 0 නැතිව) / email / Facebook / Instagram / TikTok
- Category නම්, "අප ගැන" පාඨය, footer සටහන, සියලු බොත්තම් වල අකුරු (`ui` කොටස)

### Logo සහ වර්ණ

- Logo: `images/logo.png` ගොනුව ඔබේ මුල් logo එකෙන් replace කරන්න (පසුබිම transparent PNG නම් හොඳයි).
- වර්ණ: `css/style.css` හි මුලම `:root { ... }` කොටස.

---

## 5. Computer එකේ බලන හැටි (අවශ්‍ය නම්)

Folder එක තුළ terminal එකක් ඇරලා: `npx serve` (හෝ `python3 -m http.server 8000`) → browser එකේ `http://localhost:8000`.
(`index.html` එක කෙලින්ම double-click කළොත් data ගොනු load නොවේ.)

## 6. Folder එකේ ව්‍යුහය

```
index.html          ප්‍රධාන පිටුව
admin.html          අදහස් කළමනාකරණය (/admin)
css/style.css       පෙනුම සහ වර්ණ
js/app.js           site එකේ වැඩ කරන කොටස
data/site.json      සැකසුම්, texts, contact, slideshow
data/products.json  නිෂ්පාදන, මිල, feedbacks
images/             logo, products, slides, awards
api/                comments සඳහා (Vercel functions)
```
