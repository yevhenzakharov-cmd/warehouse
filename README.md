# Warehouse Planner — password-free recovery

This archive bundles the source code supplied in our ChatGPT conversation, with **application password authentication removed**.

## What changed

- `public/index.html`: removed the password form and logout button.
- `public/app.js`: removed auth requests, login/logout logic and automatic session checks; now immediately loads `/api/plan`.
- `api/plan.js`: removed the session requirement for reads and writes, kept same-origin check for writes, ETag conflict handling, validation and storage.
- `lib/session.mjs`: only retains `sameOrigin` and `json` helpers.
- `api/auth.js`: omitted entirely.

## IMPORTANT — source recovery limitations

Six **original** layout transformation modules were never provided in the conversation:

- `lib/cold-access.mjs`
- `lib/bottom-fixtures.mjs`
- `lib/office-stairs.mjs`
- `lib/narrow-aisles.mjs`
- `lib/continuous-layout.mjs`
- `lib/category-update.mjs`

This archive contains **clearly identified temporary pass-through files** at those paths, to keep imports working. They **do not reproduce** the original detailed default layout (stairs, fixtures, cold access, etc.). When the production Vercel Blob data is connected, `/api/plan` loads the saved plan **without changing its geometry**. If Blob has no saved document, the recovered *base* seed will load instead of the exact original seed. Replace these six modules with the original implementations before relying on the initial layout.

Also, the original two WOFF2 font files were not supplied. The existing CSS falls back to system monospace fonts. The original `package-lock.json` was not supplied; `npm install` can regenerate it.

## Preserve existing data

This code still stores the shared plan at `warehouse-2871/layout-v2.json` in a private Vercel Blob store. To see the same saved plan on your current Vercel project, reconnect this Git repository to **that existing project** and preserve its Blob integration/environment variable (`BLOB_READ_WRITE_TOKEN`). Do not delete or reset its Blob store. On a different Vercel project without the original Blob connection, your saved live plan will **not** automatically transfer.

**Warning: removing the password gives every visitor to the URL both read and edit/save access.** Same-origin checks do not replace authentication; do not publish this if public editing is unwanted.

## Upload to GitHub

1. Download `warehouse-planner-password-free.zip` and unzip it on your computer.
2. Open https://github.com/new and create an empty repository (do not initialize with a README).
3. Click **uploading an existing file** on the empty repo page.
4. Drag **all the files and folders INSIDE** the extracted `warehouse-planner-password-free` folder onto GitHub, then click **Commit changes**. **Do not upload the ZIP without extracting** — GitHub won't deploy the contents of a ZIP as source files.
5. Connect the repository to your **existing Vercel project** in **Settings → Git**, preserving its existing Blob connection.

## Local development

Requires Node.js 24. `npm install`, then `npm run dev`. Local testing uses `.local-data/plan.json`, ignored by Git.
Run `npm test` for authentication-removal and seed validation checks.
