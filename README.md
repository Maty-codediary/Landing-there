# Landing There

**The arrival checklist that already knows your passport.**

Live demo: **https://landingthere.netlify.app/**

Landing There turns a passport, a destination and a purpose into a personal arrival checklist — visa rules, SIM, housing, payments, first days on the ground, and key deadlines. It's free for travelers, and organizations that relocate people (universities, relocation agencies, mobility teams) can generate a branded version of the checklist for their own clients.

Built for the Innovation & Entrepreneurship course at Audencia Business School and École Centrale Nantes.

---

## The problem

Moving abroad means re-solving the same admin puzzle every time: visa rules on one site, housing advice on another, payment tips on a forum — and the rules change depending on your own passport, not just the destination. Organizations that relocate people (international offices, agencies, mobility teams) end up answering the same questions for every new person they send.

## What it does

**For travelers**
- Enter a passport nationality, a destination, a purpose and a length of stay → get a personalized checklist covering entry/visa, SIM, housing, payments, apps, first days, and deadlines
- Rule-aware guidance across 240+ countries and territories, with 18 destinations covered by hand-written, detailed guides
- Ask **Panda**, an in-app assistant that searches the web live and cites its sources for anything specific to that trip
- Save multiple trips, add personal checklist items and deadlines, export a printable PDF pack
- Available in 6 languages

**For organizations — Partner Studio**
- Generate a client-specific link carrying the organization's name, brand color and its own steps (e.g. "book your orientation call"), layered on top of the standard checklist
- No account needed on the client's side, and no database on ours — the entire configuration is encoded directly into the link itself
- Free 30-day pilot for up to 10 users, then paid tiers for larger cohorts

## Tech stack

- **Frontend** — a single-page vanilla HTML/CSS/JavaScript app (no framework), with country and city data compiled at build time from the `world-countries` and `all-the-cities` npm packages
- **Backend** — one Netlify serverless function (`netlify/functions/panda.mjs`) that powers the live assistant, calling a free-tier LLM (Google Gemini) with web-search grounding, and falling back to a built-in "guide mode" if the live call fails or quota runs out
- **Forms** — Netlify Forms for pilot and waitlist lead capture, with a Web3Forms fallback that needs no platform-specific setup
- **Hosting** — Netlify, deployed straight from this repository

```
public/index.html                 the app
public/config.js                  your contact email + optional Web3Forms key
netlify/functions/panda.mjs       Panda: the web-search-grounded assistant
netlify.toml                      Netlify build/function configuration
```

## Running your own copy

1. Fork or clone this repository.
2. In Netlify: **Add new site → Import an existing project**, and point it at this repo. No build command is needed — `netlify.toml` handles it.
3. Add an environment variable `GEMINI_API_KEY` (a free key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)) to turn on Panda's live search. Without it, Panda still answers from its built-in guide.
4. In Netlify's **Forms** tab, enable form detection so the pilot/waitlist forms work, and set your contact email in `public/config.js`.

## What we tested

Before writing a line of pricing, we ran structured interviews and pricing surveys with 10 people across three segments — individual travelers, university international-office staff, and relocation/mobility professionals. The original price (a flat CNY 149 and a 100-user institutional minimum) was rejected by most participants, so we rebuilt the offer: a lower individual price, a smaller 10-user pilot, and fixed annual tiers instead of a per-seat minimum. The product was also checked with 50+ automated end-to-end tests covering destination search, checklist completion, and the Partner Studio flow.

## Current limitations

- Only 18 destinations have hand-written, verified guides; the rest rely on general country data plus Panda's live search, which isn't always available
- No real user accounts or database yet — trip data lives in the browser, and partner links carry their configuration in the URL itself
- No institutional pilot has run to completion yet, so pricing and unit economics are still estimates, not proven numbers

## Team

Wanshu Lin · Yiping Luo · Lin Ma · Imane Maury · Maty Traoré
Group 4, Innovation & Entrepreneurship, Audencia Business School × École Centrale Nantes
