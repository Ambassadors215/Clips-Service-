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

Important: Vercel functions **do not persist files**. The endpoints currently log submissions to function logs.
If you want real storage (recommended), we can wire Vercel KV/Postgres or email delivery.

