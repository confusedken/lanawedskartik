# Lalana & Kartik Wedding Invitation Website

A traditional Indian wedding invitation website inspired by the physical invite card design, with the same content and navigation as [lanawedskartik.vercel.app](https://lanawedskartik.vercel.app).

## Pages

- **Home** — Invitation card design with wedding details
- **Our Story** — Couple's story
- **Events** — Bride's, groom's, and combined wedding events
- **RSVP** — Guest response form
- **Gift Registry** — Gift details

## Local Preview

```bash
cd lalana-kartik-wedding
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080)

## RSVP → Google Sheets

The RSVP form submits to a Google Sheet via Apps Script.

1. Open the [RSVP spreadsheet](https://docs.google.com/spreadsheets/d/1IoWq55wBcP4h6_PZoZNDBEKXrjBsYlKUIg7W76aRKNY/edit)
2. **Extensions → Apps Script**
3. Paste in the contents of `google-apps-script/Code.gs`
4. Run **`setupSheet`** once (grant permissions when asked)
5. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the web app URL into `rsvp-config.js`:

```js
window.RSVP_SCRIPT_URL = "https://script.google.com/macros/s/....../exec";
```

7. Redeploy the website

Each submission adds a row with: timestamp, name, guest count, response, ✓ for Wedding/Reception, and message.

## Deploy

This is a static site — deploy to Vercel, Netlify, or GitHub Pages by uploading the folder contents.
