# NEPSE — NEPSE data tools (educational)

NEPSE is a personal project that fetches live LTP (last traded price) and corporate actions (bonus, rights share, cash dividend) data for stocks listed on NEPSE (Nepal Stock Exchange).

WARNING / IMPORTANT: Educational-only and ethical use
- This project is provided strictly for educational, research, and personal learning purposes only.
- Respect website Terms of Service and robots.txt. If a data provider offers an official API, prefer that API and obtain permission for automated access.
- The author is not responsible for how others use this code. Use at your own risk.

What this project does
- Provides utilities and API endpoints to fetch:
  - Live LTP for symbols on NEPSE (example scraping of Sharesansar or other public sources).
  - Corporate actions over the last 5 years (bonus issues, rights issues, cash dividends).
- Supports automated refresh (e.g., scheduled refresh every 2 days) and manual refresh endpoints/actions.
- Provides parsing and normalization so downstream tools can consume the data.

High-level architecture
- Next.js / TypeScript API routes for web-accessible endpoints.
- Scraper modules that fetch and parse data:
  - Lightweight HTML parsing (node-fetch + jsdom) for static content.
  - Optionally, headless browser approach (Puppeteer/Playwright) for pages that render dynamically or rely on JavaScript.
- Optional Python helpers and scripts for heavier data processing or archival tasks.
- Cache layer / DB (recommended) for storing last-known values and corporate actions to avoid refetching every request.
- Scheduler (cron, GitHub Actions, or an external job runner) to refresh corporate actions every 2 days.

Design & implementation notes
- Caching: Store results in a local DB (SQLite/Postgres) or an in-memory cache for live LTP to avoid repeated heavy fetches.
- Respect robots.txt: Check each data source's robots.txt and terms of service before scraping.
- Avoid bypass instructions: This repo intentionally does NOT include instructions to bypass anti-scraping protections (CAPTCHA, IP bans, Cloudflare IUAM, or other measures). Attempting to evade such protections may be illegal or violate terms of service.

Data refresh strategy
- Corporate actions (bonus/rights/cash dividend):
  - Default: refresh every 48 hours (cron or scheduled job).
  - Manual: expose an authenticated endpoint to trigger refresh.
- Live LTP:
  - Ideally use a streaming or official endpoint. If unavailable, avoid aggressive polling.
  - Aggregate and store snapshots; provide a “latest known” endpoint.

Credits & sources
- Data sources that may be referenced:
  - NepaliPaisa (https://nepalipaisa.com/)
  - MeroLagani (https://merolagani.com/)
  - ShareSansar (https://www.sharesansar.com/)

Contributing
- Contributions are welcome, but please:
  - Do not add code that circumvents a site's security or denies service.
  - Open PRs that improve parsing resilience, add official API support, or improve caching/rate-limiting.
  - Include tests for parsers and keep changes well-documented.

License
- This repository does not grant permission to scrape any website. It provides code examples and utilities for educational purposes only.
