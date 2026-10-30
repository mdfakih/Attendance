# KamaiGo — Web

Next.js 16 + MUI 9 employer dashboard and superadmin console for KamaiGo, the attendance & pay-monitoring SaaS. Talks to the backend ([Attendance_Backend](https://github.com/mdfakih/Attendance_Backend)) through a server-side proxy (`/api/t/*` tenant, `/api/c/*` platform) that keeps tokens in httpOnly cookies.

## Run locally

```bash
cp .env.example .env.local     # API_URL=http://127.0.0.1:4000
npm install
npm run dev                    # http://localhost:3000
```

Routes: `/login`, `/dashboard`, `/employees`, … (employer); `/console/login`, `/console/tenants` (superadmin).

## Look and feel

- Product name, wordmark (Kamai + **Go** in the accent colour) and tagline live in `src/lib/brand.ts` (`PRODUCT`); the employee app uses the same name (`Env.appName`).
- The KamaiGo mark (a "K" whose upper arm is a rising arrow) is `BrandMark` in `src/components/brand/brand-mark.tsx`, filled with the
  active client's gradient; `src/app/icon.svg` is the favicon and the master artwork in the default colours. The mobile launcher icons use the same geometry.
- `src/lib/theme.ts` builds the MUI theme (light + dark) from a client's branding. The console sets each client's colours and logo
  (Clients → client → Branding); the dashboard applies them after sign-in, the console and sign-in pages use the product colours.
- Everyone can switch Light / Dark / Match device from the top bar or the account menu (stored by MUI in `localStorage`).
- Modules: the console's Clients → client → Modules tab switches features on/off per client and can lock them; the dashboard hides
  switched-off menu items and shows a "switched off" page if one is opened directly.

## Shared contracts

`packages/contracts` is a copy of the backend's package. After backend changes run `npm run sync:contracts` (expects the backend repo checked out as a sibling folder `../Backend`, or pass the path).
