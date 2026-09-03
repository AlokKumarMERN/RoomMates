# RoomMates

> Split expenses. Stay organized. Live together better.

A shared-expense manager for people living together. Create a room, share the code,
log what everyone spends, and get a settlement plan with the fewest possible payments.

**Stack:** React 18 + Vite + Tailwind v4 + Recharts · Express 4 + MongoDB + Mongoose · JWT auth · Zod validation

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
│       ├── components/         ui/ (Button, Input, Select, Spinner, Skeleton)
│       │   ├── dashboard/      Summary cards, comparison table, the three charts
│       │   └── expense/        ExpenseRow · SplitEditor
│       ├── context/            AuthProvider · RoomProvider (active room)
│       ├── hooks/              useAuth · useRoom · useExpenses · useSummary
│       ├── layouts/            AppLayout (nav + room switcher)
│       ├── pages/              One component per route
│       ├── services/           api.js (axios + interceptors) + one module per resource
│       └── utils/              money.js, split.js (preview mirror), categories.js, series.js
├── server/                     Express API
│   └── src/
│       ├── config/             env.js (Zod-validated), db.js (connect + retry)
│       ├── controllers/        Thin: parse, delegate, respond
│       ├── middleware/         auth, room access, validation, rate limiting, errors
│       ├── models/             User · Room (embedded members) · Expense
│       ├── routes/             Route definitions
│       ├── services/
│       │   ├── calculation/    Pure money functions + their tests
│       │   │   ├── split.js        Resolve a split into frozen shares
│       │   │   ├── balance.js      Paid / owed / balance, totals, average
│       │   │   ├── breakdown.js    Spend by category and by day
│       │   │   └── settlement.js   Greedy minimum cash flow
│       │   ├── auth.service.js
│       │   ├── expense.service.js
│       │   ├── room.service.js
│       │   └── summary.service.js  Fetch rows, run the engine, restore names
│       ├── validators/         Zod request schemas
│       ├── utils/              ApiError, asyncHandler, response envelope, money, dates
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
membership change cannot touch it.

A subset split needs no special support: the veg-dinner case in the spec is an
equal split whose participant list happens to hold three of the five members.
Member tags ("veg", "2nd floor") are shortcuts in the Add Expense form that
pre-select those people — nothing about them reaches the money math.

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

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/health` | — | Service status, environment, DB connection state, uptime |
| `GET` | `/api/health/boom` | — | Throws deliberately, to verify the error envelope (not in production) |
| `POST` | `/api/auth/register` | — | Create an account, returns `{ user, token }`. Rate limited. |
| `POST` | `/api/auth/login` | — | Sign in, returns `{ user, token }`. Rate limited. |
| `GET` | `/api/auth/me` | Bearer | Current user — used to restore a session on reload |
| `POST` | `/api/rooms` | Bearer | Create a room; caller becomes owner + admin |
| `GET` | `/api/rooms` | Bearer | Rooms the caller is an active member of |
| `POST` | `/api/rooms/join` | Bearer | Join by code — accepts any casing, with or without the dash |
| `GET` | `/api/rooms/:roomId` | Member | Room detail with populated members |
| `GET` | `/api/rooms/:roomId/summary` | Member | Totals, per-member standing, chart series, suggested settlements — optional `from`/`to` |
| `PATCH` | `/api/rooms/:roomId` | Admin | Rename |
| `POST` | `/api/rooms/:roomId/code` | Admin | Issue a new code; the old one stops working |
| `PATCH` | `/api/rooms/:roomId/archive` | Admin | Archive |
| `POST` | `/api/rooms/:roomId/leave` | Member | Leave (owner cannot — archive instead) |
| `PATCH` | `/api/rooms/:roomId/members/:memberId` | Admin | Set role or tags |
| `DELETE` | `/api/rooms/:roomId/members/:memberId` | Admin | Remove a member |
| `POST` | `/api/rooms/:roomId/expenses` | Member | Add an expense; the split is resolved and frozen here |
| `GET` | `/api/rooms/:roomId/expenses` | Member | Paginated list — filter by category, member, date range; sortable |
| `GET` | `/api/expenses/:expenseId` | Member | One expense with its payers and shares |

A room you are not a member of returns **404, not 403** — a 403 would confirm the room
exists and let anyone probe for valid room ids.

Auth endpoints are limited to **10 attempts per 15 minutes per IP**. Wrong password and
unknown email return a byte-identical `INVALID_CREDENTIALS` response, so the API cannot
be used to discover which addresses have accounts.

Settlements are *computed* by `/summary` from the current expenses. Recording
them — the pending → paid → confirmed lifecycle — is Phase 8, and notifications
are Phase 10. See `docs/PROJECT_SPEC.md` §32 for the full planned surface.

### Room summary

`GET /api/rooms/:roomId/summary` returns the whole computed picture in one call —
totals, a row per member, the suggested payments, and the caller's own position.
Pass `from` and `to` to narrow the window; with neither, it covers the room's
whole history.

Two numbers on each member row look alike and are not:

| Field | Meaning |
| --- | --- |
| `balance` | `paid − owed`. What this person is actually up or down. Settlements are built from it, and across everyone it always sums to exactly zero. |
| `difference` | `paid − average`. A spending comparison for the §11 table — "you put in ₹100 less than the typical person here". Display only; nothing settles against it. |

They coincide only when every expense was split equally between everybody.
Conflating them is how a dashboard ends up quoting a debt the Settle Up page has
never heard of.

**Who gets a row:** every active member, plus anyone appearing in these expenses
even if they have since left. Leaving does not cancel a debt — a departed
member's shares are frozen on expenses that already happened. Each row carries
`isActive` so the UI can label them, but the money counts either way. Drop those
rows and balances stop summing to zero and the room can never fully settle.

**What divides into the average:** active members only. The average asks "what is
a normal amount to be putting in around here?", which is a question about the
people currently living together — and since it is display-only, a long-departed
member in the denominator would skew today's table for no gain.

It also carries the two chart series the dashboard plots — `byCategory` and
`byDay`. Both read each expense's `amount` rather than anyone's share, so "we
spent ₹11,000 on groceries" reads the same whoever is looking at it. Spend *by
member* needs no extra series: it is the `paid` field already on each member row.
`byDay` returns only days that have expenses — the client fills the gaps, and
rolls up to months past 62 days, because only it knows the window it is drawing.

Settlements use the greedy minimum-cash-flow algorithm: match the largest debtor
against the largest creditor, transfer `min(debt, credit)`, repeat. At most
*n−1* payments for *n* members. Note this settles the spec §5 example in **two**
payments (Rahul→Rohit ₹300, Alok→Aman ₹100) where §5 sketches three — both zero
everyone out, and the greedy one is what §5's own "minimize unnecessary
transactions" asks for.

### Adding an expense

`participants` accepts a bare member id when the split needs no extra numbers,
so the common case stays short:

```jsonc
{
  "amount": 200000,                    // ₹2000 in paise
  "description": "Dinner",
  "category": "food",
  "date": "2026-09-01",
  "splitType": "equal",
  "participants": ["<memberId>", "<memberId>"],
  "paidBy": "<memberId>"               // or [{ "user": "...", "amount": 120000 }, ...]
}
```

| Split type | `participants` entry | Server checks |
| --- | --- | --- |
| `equal` | `"<memberId>"` | At least one participant |
| `custom` | `{ user, amount }` | Amounts sum to the total, exactly |
| `percentage` | `{ user, percentage }` | Percentages sum to 100, at most 2 decimals |

Splitting between a subset of the room is any of the three with a shorter list —
there is no fourth type. Everyone named must be a current, active member.

Remainder paise are never dropped: ₹1000 split three ways stores 33334 / 33333 /
33333, and the extra paise goes to the same person however the client ordered
the array. `server/src/services/calculation/split.js` is the only place this
happens, and it is tested against randomised inputs.

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
| 2. Authentication | ✅ Done |
| 3. Rooms, codes & membership | ✅ Done |
| 4. Expenses & split resolution | ✅ Done |
| 5. Calculation engine | ✅ Done |
| 6. Dashboard | ✅ Done |
| 7. Editing, revisions & soft delete | Next |
| 8. Settlements | |
| 9. History, search & filtering | |
| 10. Notifications & real-time | |
| 11. Responsive polish & performance | |
| 12. Security hardening & tests | |
| 13. Seed data, docs & deployment | |

Full plan with estimates and per-phase acceptance criteria:
[`docs/RoomMates-Project-Plan.pdf`](docs/RoomMates-Project-Plan.pdf)

---

## Dashboard

`/dashboard` makes one request — `GET /api/rooms/:roomId/summary` — and renders
everything from it. Five separate calls would let the summary cards and the
comparison table describe two different moments if an expense landed in between.

**Every chart is a single series.** Spend by member, spend by category and spend
over time each plot one measure, which makes the colour job *sequential* — one
hue — rather than categorical. So there is no palette of eight to tell apart, no
legend to read (the card title already names what is plotted), and no temptation
to shade each bar darker-where-bigger, which would double-encode bar length as
hue and spend the only free channel restating what the bar already shows.

**Every chart has a table twin.** A tooltip must never be the only way to reach a
value — keyboard, screen-reader and print users have no hover — so each card has
a Table toggle carrying the same numbers.

**The comparison table shows paise.** `Paid − Their share = Balance`, and readers
check that; rounding the first two breaks the arithmetic on screen (₹35,270 −
₹12,251 is ₹23,019, but the balance is ₹23,018.85). The headline cards round,
because nobody subtracts those.

A refetch dims the previous numbers rather than dropping back to skeletons —
skeletons are for a first load only, so a filter change never jumps the layout.

---

## Notes on dependency choices

- **Express 4, not 5** — Express 5 makes `req.query` a getter, which breaks several
  common security middlewares. Express 4 is fully supported and the whole ecosystem
  works with it.
- **Tailwind v4** — configured in CSS via `@theme` in `src/index.css` and the
  `@tailwindcss/vite` plugin. There is deliberately no `tailwind.config.js` or
  `postcss.config.js`; v4 does not use them.
- **Recharts** — it is the single largest thing in the bundle (the production
  build is ~688 kB raw / ~208 kB gzipped, most of it Recharts and its D3
  dependencies). Acceptable for now; code-splitting the dashboard route is
  Phase 11's job, not something to solve by hand-rolling SVG charts today.
