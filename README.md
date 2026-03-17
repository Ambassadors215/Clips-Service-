# Dimshaircare

## Run locally (Windows / PowerShell)

1) Install Node.js 18+ (LTS).
2) In this folder:

```powershell
npm install
npm start
```

Then open `http://localhost:3000`.

## Deploy to Railway (quick)

- Create a new Railway project
- Add this repo as a service (from GitHub)
- Railway will run `npm start`
- `PORT` is set automatically (Railway provides it)

### Notes

- Submissions are stored to local JSON files under `data/` at runtime.
- `data/*.json` is gitignored (so real submissions won’t be committed).

## Deploy to Vercel

This repo includes Vercel serverless endpoints:

- `POST /api/booking`
- `POST /api/contact`

### Free storage (Google Sheets)

To store submissions for free, use Google Sheets via a Google Apps Script webhook.

1) Create a Google Sheet (e.g. tabs `booking` and `contact`)
2) In Google Apps Script, deploy a Web App that accepts POST and appends rows
3) In Vercel project settings → Environment Variables, set:

- `GOOGLE_SHEETS_WEBHOOK_URL` = your Apps Script Web App URL

If `GOOGLE_SHEETS_WEBHOOK_URL` is not set, submissions will still work but will only be logged in Vercel function logs.

