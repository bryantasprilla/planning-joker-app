# Planning Joker

Planning poker for backlog refinement. The dealer deals a table and shares the link. Everyone plays a card face down, and the dealer reveals them. When every estimate matches, the cards glow gold. Each ticket is one round.

- No accounts. People type a name once; the browser remembers it.
- Tables are temporary and clear out about a day after they're dealt.
- Static site (Vite + React + TypeScript) hosted on GitHub Pages, with a custom domain through Cloudflare DNS. Live table data lives in Firestore on Firebase's free Spark plan. There's no server to run.

## How it's built

| Piece | Where |
| --- | --- |
| All reads/writes | `src/sessionApi.ts` |
| Live table subscription, anonymous sign-in | `src/hooks.ts` |
| Data shape | `src/types.ts` |
| Consensus + stats | `src/votes.ts` |
| Security rules | `firestore.rules` (checked by `scripts/check-rules.mjs`) |

**One document per table.** Players, the current round, votes and round history all live on `sessions/{tableId}`. This is deliberate: Firestore's TTL deletes a document but not its subcollections, so keeping everything on one document means the TTL policy on `expiresAt` removes a whole table in one go. Don't move votes or players into subcollections.

**Identity without logins.** Each browser signs in with Firebase Anonymous Auth in the background, so there's no login screen. That gives every player a stable id, which the security rules use to make sure you can only play your own card or change your own name, and only the dealer can reveal or deal the next round.

**Hidden cards.** Other players' values are never rendered until the reveal. The values are in the Firestore document, so someone determined could read them from devtools. That's an accepted trade-off for a team estimation tool.

## Run it locally (no Firebase account needed)

Needs Node 20+ and Java 21+ (for the Firebase emulators).

```sh
npm install
npm run emulators          # terminal 1: Auth + Firestore emulators, UI at http://127.0.0.1:4000
VITE_USE_EMULATORS=true npm run dev   # terminal 2 (PowerShell: $env:VITE_USE_EMULATORS='true'; npm run dev)
npm run test:rules         # optional: checks every allowed/denied write against the emulators
```

Open http://localhost:5173, deal a table, and open the invite link in a private window to play a second seat.

## Set up Firebase (free)

1. Create a project at https://console.firebase.google.com. The free **Spark** plan is enough, and it can't bill you.
2. **Build → Firestore Database → Create database** (production mode, any region).
3. **Build → Authentication → Sign-in method → Anonymous → Enable.**
4. **Project settings → Your apps → Add web app.** Copy the config values into `.env.local` (see `.env.example`). These keys are meant to be public; the security rules are what protect the data.
5. Deploy the rules:
   ```sh
   npx firebase login
   npx firebase deploy --only firestore:rules --project <your-project-id>
   ```
6. Add the TTL policy: **Firestore → Time-to-live (TTL) → Create policy**, collection group `sessions`, timestamp field `expiresAt`. Firestore deletes expired tables in the background, usually within 24 hours of expiry. If the console won't offer TTL on your plan, you can skip it: the app and rules already treat tables older than 24h as closed, and leftover documents are tiny.

## Deploy (GitHub Pages + Cloudflare, free)

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`. It's switched off until the repo has its own domain: a Pages site on this account would otherwise appear at `bryantasprilla.com/planning-joker`, which belongs to a different site.

1. **Repo variables** (**Settings → Secrets and variables → Actions → Variables**): add the four `VITE_FIREBASE_*` values from `.env.local`. They're public by design, so variables are fine; no secrets needed.
2. **Cloudflare DNS** for the new domain, same as the portfolio:
   - Apex (`example.com`): four `A` records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
   - `www`: `CNAME` to `bryantasprilla.github.io`.
   - Set them to **DNS only** (grey cloud) until GitHub has issued the HTTPS certificate; you can turn the proxy on afterwards with SSL/TLS mode **Full**.
3. **Settings → Pages**: source **GitHub Actions**, then enter the new domain under **Custom domain** and tick **Enforce HTTPS** once it's available.
4. Add the repo variable `PAGES_LIVE` = `true`, then run the workflow (**Actions → Deploy to GitHub Pages → Run workflow**) or push to `main`.
5. In Firebase, add the domain under **Authentication → Settings → Authorized domains**.

The build copies `index.html` to `404.html`, which is how `/table/<id>` links keep working on refresh with Pages' static hosting.

## Teams later

A Teams tab is an iframe pointing at a hosted URL, so this same deployment becomes the tab. The code already avoids things that break in an iframe: sharing uses the Clipboard API with a manual-copy fallback, not `window.open`; storage access falls back to memory if the webview blocks `localStorage`; and there are no `alert`/`confirm` dialogs. The Teams work is a manifest, plus optionally using the Teams SDK to prefill the player's name and theme.
