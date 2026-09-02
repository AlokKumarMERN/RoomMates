# RoomMates

> Split expenses. Stay organized. Live together better.

A shared-expense manager for people living together. Create a room, share the code,
log what everyone spends, and get a settlement plan with the fewest possible payments.

**Stack:** React 18 + Vite + Tailwind v4 · Express 4 + MongoDB + Mongoose · JWT auth · Zod validation

---

## Quick start

**Requirements:** Node 20+, MongoDB running locally (or an Atlas connection string).

```bash
# 1. Backend
cd server
cp .env.example .env          # then set MONGODB_URI and JWT_SECRET
npm install
npm run dev                   # → http://localhost:5000

# 2. Frontend (in a second terminal)
cd client
cp .env.example .env
npm install
npm run dev                   # → http://localhost:5173
```

Open <http://localhost:5173>. The page reports whether the API and database are reachable.

Generate a `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## Environment variables

### `server/.env`

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | `development` \| `test` \| `production` |
| `PORT` | no | `5000` | API port |
| `MONGODB_URI` | **yes** | — | e.g. `mongodb://127.0.0.1:27017/roommates` |
| `JWT_SECRET` | **yes** | — | Minimum 32 characters |
| `JWT_EXPIRES_IN` | no | `7d` | Access token lifetime |
| `CLIENT_URL` | no | `http://localhost:5173` | Allowed CORS origins, comma-separated |

The server validates these with Zod at boot and exits with a readable message if
anything is missing — no `undefined` surprises at request time.

### `client/.env`

| Variable | Default | Notes |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:5000/api` | Vite exposes only `VITE_`-prefixed vars to the browser — never put a secret here |

---

## Project structure

```
RoomMates/
├── client/                     React frontend
│   └── src/
│       ├── components/         Reusable UI
│       ├── pages/              One component per route
│       ├── services/           api.js (axios + interceptors) + one module per resource
│       └── utils/              money.js, formatting helpers
├── server/                     Express API
│   └── src/
│       ├── config/             env.js (Zod-validated), db.js (connect + retry)
│       ├── middleware/         errorHandler.js, notFound.js
│       ├── routes/             Route definitions
│       ├── utils/              ApiError, asyncHandler, response envelope, money
│       ├── app.js              Express app assembly
│       └── server.js           Boot + graceful shutdown
└── docs/
    ├── PROJECT_SPEC.md               Full requirements
    └── RoomMates-Project-Plan.pdf    Architecture + 13-phase build plan
```

---

## Conventions

These three rules apply everywhere and are the reason the money math stays correct.

### 1. Money is always integer paise

₹500.50 is stored, sent, and calculated as `50050`. Rupees exist only when parsing
user input and formatting for display.

JavaScript numbers are binary floats and cannot represent `0.1` exactly. A percentage
split of ₹1000 three ways in floating point leaves stray fractions that accumulate
until member balances no longer sum to zero and the settlement page shows ₹0.01 debts
nobody owes. Integers make that impossible. See `server/src/utils/money.js`.

### 2. Expense splits are frozen at write time

When an expense is created the server resolves the split immediately and stores the
result as an immutable `shares[]` array on the expense — who participates, and for how
much. Nothing ever recomputes a split from *current* room membership.

This is what keeps history accurate. If shares were derived at read time, a fifth
person joining would silently re-split every past expense five ways and last month's
report would change. Because each expense carries its own participant list, a
membership change cannot touch it. *(Added in Phase 4.)*

### 3. Every response uses the same envelope

```jsonc
// Success
{ "success": true, "data": { ... }, "meta": { ... } }   // meta only on paginated lists

// Failure
{ "success": false, "error": { "code": "ROOM_NOT_FOUND", "message": "...", "details": [ ... ] } }
```

The client's axios interceptor normalises every failure — including network errors and
timeouts — into an object with `.message`, `.code`, and `.status`, so components can
just read `error.message`.

---

## API

Implemented so far:

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Service status, environment, DB connection state, uptime |
| `GET` | `/api/health/boom` | Throws deliberately, to verify the error envelope (not in production) |

Auth, rooms, expenses, settlements and notifications arrive in Phases 2–10.
See `docs/PROJECT_SPEC.md` §32 for the full planned surface.

---

## Scripts

**server**

| Command | Description |
| --- | --- |
| `npm run dev` | Start with nodemon (auto-restart) |
| `npm start` | Start once |
| `npm test` | Run the Vitest suite |

**client**

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |

---

## Build progress

| Phase | Status |
| --- | --- |
| 1. Foundation & architecture | ✅ Done |
| 2. Authentication | Next |
| 3. Rooms, codes & membership | |
| 4. Expenses & split resolution | |
| 5. Calculation engine | |
| 6. Dashboard | |
| 7. Editing, revisions & soft delete | |
| 8. Settlements | |
| 9. History, search & filtering | |
| 10. Notifications & real-time | |
| 11. Responsive polish & performance | |
| 12. Security hardening & tests | |
| 13. Seed data, docs & deployment | |

Full plan with estimates and per-phase acceptance criteria:
[`docs/RoomMates-Project-Plan.pdf`](docs/RoomMates-Project-Plan.pdf)

---

## Notes on dependency choices

- **Express 4, not 5** — Express 5 makes `req.query` a getter, which breaks several
  common security middlewares. Express 4 is fully supported and the whole ecosystem
  works with it.
- **Tailwind v4** — configured in CSS via `@theme` in `src/index.css` and the
  `@tailwindcss/vite` plugin. There is deliberately no `tailwind.config.js` or
  `postcss.config.js`; v4 does not use them.
