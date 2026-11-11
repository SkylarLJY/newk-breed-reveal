# What breed is Newk?

A small static site where friends guess your dog's top 3 breeds (with percentages), see what everyone else guessed once they've submitted, and get scored at the in-person reveal. Guesses are saved to a Google Sheet you own.

- `index.html`: guessing page (photos, guess form, crowd stats that unlock after you guess)
- `reveal.html`: for you at the reveal. Type in the real DNA breakdown and it scores every guess. Nothing is saved; it only runs on that screen.

## 1. Try it locally (demo mode)

Open `index.html` in a browser. With no sheet connected, guesses are saved only in that browser, which is handy for testing.

## 2. Connect a Google Sheet

1. Create a new blank sheet at https://sheets.new (name it anything, e.g. "Newk guesses").
2. In the sheet: **Extensions → Apps Script**. Delete what's there, paste in all of `google-sheet-script.gs`, and click **Save**.
3. Click **Deploy → New deployment**. Click the gear next to "Select type" and choose **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy** and approve the permissions. Google warns that the app isn't verified because you wrote it yourself; click **Advanced → Go to … (unsafe)**.
5. Copy the **Web app URL** (ends in `/exec`) into `config.js` as `SHEET_URL`.

Guesses appear as rows in a "Guesses" tab. To remove a spam or duplicate guess, delete its row.

If you edit the script later, use **Deploy → Manage deployments → Edit → Version: New version** so the URL stays the same.

## 3. Photos

Photos live in `photos/` and are listed in `config.js`. They're resized JPEGs with location data removed. Keep any new ones small and without location data before adding them.

## 4. Publish

Any static host works. The easiest is **Netlify Drop**: drag this folder onto https://app.netlify.com/drop and share the link it gives you.

## How scoring works

For each breed, a guess earns the smaller of its % and the real %. Points are summed, so 100 is a perfect guess.
Example: the real result is Lab 60 / Pit 40, and someone guesses Lab 50 / Boxer 30 / Pit 20. They score 50 + 20 = **70**.
