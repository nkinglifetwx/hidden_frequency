# Hidden Frequencies V3 — AI-backed discovery

Aesthetic music discovery web app with an AI prompt interpreter and a server-side function.

## Stack
- Frontend: HTML, CSS, vanilla JavaScript.
- Serverless backend: Cloudflare Pages Functions (`functions/api/discover.js`).
- AI: OpenAI Chat Completions API. The model interprets the user's mood and returns concise catalogue search terms.
- Music catalog: iTunes Search API for track metadata, artwork, preview URLs when available, and official outbound links.

## Why this design?
The AI interprets the vibe but does not invent tracks. Search results are fetched from a real catalogue. The OpenAI key stays server-side in a Cloudflare secret and is never shipped to the browser.

## Requirements
- A Cloudflare account (Pages hosting with Functions).
- An OpenAI API key and API billing enabled for the account. ChatGPT Plus does not automatically include API usage.
- Do not put API keys in `app.js`, HTML, or CSS.

## Deploy to Cloudflare Pages
1. Create a GitHub repository and upload `index.html`, `style.css`, `app.js`, `README.md`, and the `functions/` directory preserving its structure.
2. Sign in to https://dash.cloudflare.com/ and open **Workers & Pages**.
3. Create a Pages project connected to the GitHub repository.
4. For a plain static site with Functions, leave the build command empty and set the output directory to `/` if prompted. If the dashboard rejects the root output setting, follow Cloudflare Pages' current static-site setup instructions.
5. After the first deployment, open the project’s **Settings → Variables and Secrets** (or **Environment variables**) and add:
   - `OPENAI_API_KEY` = your secret API key (mark it as secret/encrypted).
   - Optional `OPENAI_MODEL` = `gpt-4o-mini`.
6. Redeploy the project so the function receives the secret.
7. Open your Pages URL and try a prompt like “warm, hazy indie for a late train ride, not too upbeat”.

## Local testing
Cloudflare Pages Functions do not run by opening `index.html` directly. Install Node.js, then use Wrangler:
- `npm install -g wrangler`
- From this project directory, run `wrangler pages dev .`
- Set local secrets in a `.dev.vars` file (do not commit this file):
  `OPENAI_API_KEY=your_key_here`
  `OPENAI_MODEL=gpt-4o-mini`

## Notes / limitations
- The app uses OpenAI to interpret text and create search terms, then verifies returned tracks against iTunes. This is a lightweight recommendation pipeline, not a trained personalization model.
- iTunes results may include mainstream tracks; this integration does not provide a reliable popularity score. It must not claim every result is obscure.
- Previews and artwork are only available when supplied by the catalogue. Full tracks open on the linked store page.
- Likes are held in memory for the current page session. To persist them, add a database or browser storage later.
- Add rate limiting and abuse protection before sharing widely. Public endpoints can incur API costs.
- Check current OpenAI and Cloudflare terms, pricing and model availability before public launch.


## Important : où héberger le site

Si l'adresse utilisée finit par `github.io`, le site est encore servi par GitHub Pages. GitHub Pages ne peut pas exécuter `functions/api/discover.js`, d'où l'erreur 405 sur `/api/discover`.

Il faut publier ce dépôt sur **Cloudflare Pages** (Workers & Pages → Create → Pages → Connect to Git), avec le dossier de sortie à la racine du dépôt (`/` ou `.`), puis ajouter `OPENAI_API_KEY` dans les secrets du projet Pages en environnement Production et redéployer. Teste ensuite l'adresse `https://...pages.dev`, pas l'adresse `github.io`.

Après avoir modifié ces fichiers, envoie les changements sur GitHub pour déclencher un nouveau déploiement Cloudflare Pages.
