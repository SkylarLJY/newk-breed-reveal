# What breed is Newk?

Guessing game for Newk's Embark DNA results. Friends guess his top three breeds with percentages, see what everyone else guessed after they submit, and get scored when I reveal the real result in person.

- `index.html`: the guessing page
- `reveal.html`: for reveal day. I enter the Embark breakdown and it ranks everyone. Nothing entered there is saved.

## Where things live

- **Guesses:** my Google Sheet, one row per guess. The sheet's Apps Script (`google-sheet-script.gs`) is the only way the site reads or writes it, and its URL is in `js/data.js`. To remove a junk guess, delete its row.
- **Photos:** `photos/`, listed in `js/app.js`. Resized, with location data removed. The originals are in `../newk-photo-originals`.
- **Breed list:** `js/breeds.js`, using Embark's breed names (from embarkvet.com, Nov 2026) so guesses can be scored. Designer crosses are left out, and the only village dogs are Chinese, Korean and Japanese.

## Updating

After changing any CSS or JS, bump the `?v=` number on the `<link>` and `<script>` tags in both HTML files so browsers load the new version.

If I edit the Apps Script, redeploy with **Deploy → Manage deployments → Edit → New version** so the URL stays the same.

## Scoring

For each breed, a guess earns the smaller of its % and the real %, summed out of 100.
Example: real result Lab 60 / Pit 40, guess Lab 50 / Boxer 30 / Pit 20 → 50 + 20 = **70**.
