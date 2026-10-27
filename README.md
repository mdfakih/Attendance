# Attendance Web

Next.js 16 + MUI 9 employer dashboard and superadmin console for the attendance & pay-monitoring SaaS. Talks to the backend ([Attendance_Backend](https://github.com/mdfakih/Attendance_Backend)) through a server-side proxy (`/api/t/*` tenant, `/api/c/*` platform) that keeps tokens in httpOnly cookies.

## Run locally

```bash
cp .env.example .env.local     # API_URL=http://127.0.0.1:4000
npm install
npm run dev                    # http://localhost:3000
```

Routes: `/login`, `/dashboard`, `/employees`, … (employer); `/console/login`, `/console/tenants` (superadmin).

## Shared contracts

`packages/contracts` is a copy of the backend's package. After backend changes run `npm run sync:contracts` (expects the backend repo checked out as a sibling folder `../Backend`, or pass the path).
