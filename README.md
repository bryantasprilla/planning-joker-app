# Planning Joker

Planning poker for backlog refinement, live at **https://planningjoker.com**. The dealer deals a table and shares the link. Everyone plays a card face down (or folds), and the dealer reveals them. When every estimate matches, the cards glow gold: "Three of a Kind!". Each ticket is one round.

- No accounts. People type a name once and the browser remembers it.
- Tables close 24 hours after they're dealt and are deleted about a day later.
- Static site (Vite + React + TypeScript) on GitHub Pages, with the domain on Cloudflare. Live data is in Firestore on Firebase's free Spark plan. No server to run, and nothing here costs money.

## Features

- **Dealing:** themed invite codes (`royal-flush-7q2k`), invite links at `/?table=<code>`, a deck of 0, 1, 2, 3, 5, 8, 13, 21.
- **Rounds:** reveal, re-vote, next round with a ticket name, and round history. Consensus needs at least two matching cards.
- **Fold:** a themed poker chip beside the hand lets a player sit a ticket out. Folds don't hold up the reveal and don't count in the stats.
- **Dealer options:** pass the dealer button to another seated player, or close the table for everyone.
- **Display settings:** System, Light or Dark, plus card themes Default (violet lattice), Magenta (art deco sunburst) and Olive (mirrored olive sprigs). Each theme has its own Fold chip color. Saved per browser.
- **Landing page:** a slot-machine "hands dealt" counter (at least three digits) that rolls up live as hands are revealed anywhere.

## How it's built

| Piece | Where |
| --- | --- |
| All game reads/writes | `src/sessionApi.ts` |
| Live subscriptions, anonymous sign-in, hands-dealt count | `src/hooks.ts` |
| Data shape | `src/types.ts` |
| Consensus, stats, Fold | `src/votes.ts` |
| Display settings (theme, card theme) | `src/storage.ts`, `src/components/DisplaySettings.tsx` |
| Security rules | `firestore.rules`, checked by `scripts/check-rules.mjs` |
| Daily cleanup of expired tables | `scripts/cleanup-tables.mjs`, `.github/workflows/cleanup.yml` |
| Hand location logging | `worker/` (Cloudflare Worker) |
| Privacy page | `public/privacy/index.html` (served at `/privacy/`) |

**One document per table.** Players, the current round, votes and round history all live on `sessions/{tableId}`, so deleting one document removes a whole table. Don't move votes or players into subcollections.

**Identity without logins.** Each browser signs in with Firebase Anonymous Auth in the background. The security rules use that ID so you can only play your own card or change your own name, and only the dealer can reveal, deal the next round, pass the button or close the table.

**Hidden cards.** Other players' values are never rendered until the reveal. They are in the table document, so someone determined could read them from devtools. That's an accepted trade-off for a team estimation tool.

**Tables can be opened, never listed.** Anyone signed in can read a table by its code (that's how invite links work), but listing or querying tables is denied.

**Hands-dealt counter.** `stats/global.handsDealt` is incremented in the same batch as a reveal. The rules only accept +1, by that table's dealer, when the table goes from voting to revealed in that same batch, so the count can't be pumped.

**Where hands are played.** After a reveal the app sends `{ table, round }` to the Worker at `api.planningjoker.com/hand`. The Worker checks that round really was revealed, then writes `hands/{hash}` with only country, region, city and time (from Cloudflare's `request.cf`). There's no IP and no table code, and a re-vote of the same round overwrites rather than adds. The `hands` collection is closed to visitors; read it in the Firebase console. It only runs when `VITE_HAND_LOG_URL` is set.

## Run it locally (no Firebase account needed)

Needs Node 20+ and Java 21+ (for the Firebase emulators).

```sh
npm install
npm run emulators          # terminal 1: Auth + Firestore emulators, UI at http://127.0.0.1:4000
VITE_USE_EMULATORS=true npm run dev   # terminal 2 (PowerShell: $env:VITE_USE_EMULATORS='true'; npm run dev)
npm run test:rules         # checks every allowed/denied write against the emulators
```

Open http://localhost:5173, deal a table, and open the invite link in a private window to play a second seat.

Optional, to try location logging locally: put `VITE_HAND_LOG_URL=http://localhost:8787/hand` in `.env.development.local`, then in `worker/` run `npx wrangler dev --port 8787 --var FIRESTORE_EMULATOR_HOST:127.0.0.1:8080`.

## The live setup

Everything below is already done for `planning-joker-app` / planningjoker.com. It's here for reference or for rebuilding.

### Firebase (free Spark plan)

1. Create a project, then **Firestore Database** (production mode; this one is in `nam5`) and **Authentication → Sign-in method → Anonymous**.
2. **Project settings → Your apps → Add web app**, and copy the config into `.env.local` (see `.env.example`). These keys are public by design; the security rules protect the data.
3. Deploy the rules: `npx firebase login`, then `npx firebase deploy --only firestore:rules`.
4. In **Authentication → Settings → Authorized domains**, add the site's domain.

Firestore's built-in TTL needs billing, so the cleanup job below does that work instead.

### Hosting (GitHub Pages + Cloudflare)

`.github/workflows/deploy.yml` builds and publishes on every push to `main`, gated on the repo variable `PAGES_LIVE=true`. Repo variables hold the four `VITE_FIREBASE_*` values and `VITE_HAND_LOG_URL`. Cloudflare DNS has four `A` records for the apex (`185.199.108–111.153`) and `www` as a `CNAME` to `bryantasprilla.github.io`, all **DNS only**. Pages has the custom domain set with HTTPS enforced. Attach the custom domain only after DNS resolves, or GitHub never issues the certificate.

Tables live at `/?table=<code>`, which Pages serves with a normal 200. The build copies `index.html` to `404.html` so old `/table/<code>` links still load and redirect.

### Daily cleanup (GitHub Actions)

`cleanup.yml` runs daily at 07:17 UTC (or manually from the Actions tab) and deletes tables that expired more than a day ago. It also re-enables itself each run, because GitHub switches off scheduled workflows after 60 days without commits.

It signs in as the service account `table-cleanup@planning-joker-app.iam.gserviceaccount.com` (role **Cloud Datastore User** only), with its JSON key in the repo secret `FIREBASE_CLEANUP_KEY`. To test without deleting anything: `node scripts/cleanup-tables.mjs --dry-run`, with that key in the `FIREBASE_CLEANUP_KEY` environment variable.

### Location logging (Cloudflare Worker)

`worker/` deploys to `api.planningjoker.com` with `npx wrangler deploy` (run `npx wrangler login` first). It signs in as `hand-logger@planning-joker-app.iam.gserviceaccount.com` (**Cloud Datastore User** only), whose key is the Worker secret `GCP_KEY` (`npx wrangler secret put GCP_KEY`).

### Keys

Both service-account keys are long-lived. Rotating them about once a year is good practice: create a new key in Google Cloud (IAM → Service accounts → Keys), update the secret (GitHub for cleanup, `wrangler secret put` for the Worker), then delete the old key. Some shells (PowerShell) add a byte-order mark when piping a key; both scripts strip it.

## Teams later

A Teams tab is an iframe pointing at a hosted URL, so this same deployment becomes the tab. The code already avoids things that break in an iframe: sharing uses the Clipboard API with a manual-copy fallback rather than `window.open`, storage access falls back to memory if the webview blocks `localStorage`, and there are no `alert`/`confirm` dialogs. The Teams work is a manifest, plus optionally the Teams SDK to prefill the player's name and theme.
