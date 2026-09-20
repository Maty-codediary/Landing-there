# Landing There

```
public/index.html                 the whole app (static)
netlify/functions/panda.mjs       Panda Live: web-searching assistant (server side)
netlify.toml                      tells Netlify where things are
```

## Deploy (about 10 minutes)

1. Put this folder in a GitHub repository, then in Netlify choose **Add new site > Import an existing project** and pick the repo. Netlify reads `netlify.toml`; no build command is needed.
   (Alternative: `npm i -g netlify-cli`, then `netlify deploy --prod` from this folder. Plain drag-and-drop may skip the function.)
2. **Site configuration > Environment variables**, add:
   - `ANTHROPIC_API_KEY`: a key from console.anthropic.com. Web search must be enabled for your Anthropic organization.
   - optional `PANDA_MODEL`: defaults to `claude-haiku-4-5-20251001`. Check the model name is current in the Console.
   - optional `PANDA_MAX_SEARCHES`: web searches per question, default 3.
3. Redeploy, then open `https://YOUR-SITE/api/panda`. You should see `{"ok":true,"live":true}`. In the app, Panda's pill then shows **Live, web search**. If it shows **Guide mode**, the function or key is not reachable and Panda answers from the built-in guide only.
4. **Forms**: Netlify detects the `pilot-request` and `waitlist` forms on deploy. Add an email notification under Forms > Form notifications so leads reach you.
5. In `public/index.html`, set `CONFIG.CONTACT_EMAIL` (near the end of the script) to your team inbox. It is the fallback if a form post fails.

## Costs and safety
- Each Panda question can trigger up to 3 web searches, billed per search plus tokens. Set a monthly spend limit in the Anthropic Console.
- The function rate-limits each visitor to 20 questions per 10 minutes, best effort. For a public launch, add stronger protection.
- The API key never reaches the browser.
