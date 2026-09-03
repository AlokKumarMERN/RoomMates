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
│       ├── components/         ui/ (Button, Input, Select, Spinner, Skeleton, Toaster, icons)
│       │   ├── dashboard/      Summary cards, comparison table, the three charts
│       │   ├── expense/        ExpenseRow · ExpenseForm · ExpenseFilters · SplitEditor · RevisionHistory
│       │   └── settlement/     SettlementRow
│       ├── context/            AuthProvider · RoomProvider (active room) · ToastProvider
│       ├── hooks/              useAuth · useRoom · useExpenses · useSummary · useSettlements · useNotifications · useToast · useDebouncedValue
│       ├── layouts/            AppLayout (nav + room switcher)
│       ├── pages/              One component per route
│       ├── services/           api.js (axios + interceptors) + one module per resource
│       └── utils/              money.js, split.js (preview mirror), categories.js, series.js
├── server/                     Express API
│   └── src/
│       ├── config/             env.js (Zod-validated), db.js (connect + retry)
│       ├── controllers/        Thin: parse, delegate, respond
│       ├── middleware/         auth, room access, validation, rate limiting, errors
│       ├── models/             User · Room · Expense · ExpenseRevision · Settlement · Notification
│       ├── routes/             Route definitions
│       ├── services/
│       │   ├── calculation/    Pure money functions + their tests
│       │   │   ├── split.js        Resolve a split into frozen shares
│       │   │   ├── balance.js      Paid / owed / balance, totals, average
│       │   │   ├── breakdown.js    Spend by category and by day
│       │   │   ├── diff.js         What changed between two versions
│       │   │   └── settlement.js   Greedy minimum cash flow
│       │   ├── auth.service.js
│       │   ├── expense.service.js
│       │   ├── room.service.js
│       │   ├── notification.service.js  Raise and read notifications
│       │   ├── settlement.service.js  Record a payment; move it along
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

### 4. The member roster is never trusted from cache when money is being split

A room is shared, so its membership changes underneath an open page. `RoomProvider`
holds the rooms for the switcher and the headers, and refreshes them whenever the tab
regains focus — but the two screens that divide money between people (Add Expense,
Edit Expense) re-fetch the room and *wait* for the answer before rendering a form.

This is not cosmetic. A stale roster does not merely look wrong, it writes wrong:
splitting between "everyone" against a list that predates somebody joining produces an
expense that quietly leaves that person out, and the split is frozen, so nothing later
corrects it. The symptom was three people in one room being offered one, two and three
names in the same form — each seeing the roster as it stood when their page happened to
load.

A person who joins while a form is already open appears in the list **unticked**. The
form is keyed on the room rather than its members, so a new arrival never wipes a
half-filled form — and nobody is added to a split you are composing without you saying
so.

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
| `GET` | `/api/rooms/:roomId/expenses` | Member | Paginated history — search, category, member, date range, amount range, split type, edited, removed; four sort orders |
| `GET` | `/api/expenses/:expenseId` | Member | One expense with its payers and shares |
| `PATCH` | `/api/expenses/:expenseId` | Creator | Edit it; the previous values are kept as a revision |
| `DELETE` | `/api/expenses/:expenseId` | Creator or admin | Soft delete — the record stays, the totals drop it |
| `GET` | `/api/expenses/:expenseId/history` | Member | Every edit: what changed, who changed it, when |
| `POST` | `/api/rooms/:roomId/settlements` | Party | Record a payment between two people; starts `pending` |
| `GET` | `/api/rooms/:roomId/settlements` | Member | Settlement history, newest first — filter by `status` |
| `PATCH` | `/api/settlements/:settlementId` | Payer / receiver | `paid`, `confirmed` or `cancelled` |
| `GET` | `/api/notifications` | Bearer | Your notifications, newest first — `unread`, `room`, paginated |
| `GET` | `/api/notifications/count` | Bearer | Unread count only. This is what the bell polls. |
| `PATCH` | `/api/notifications/:id/read` | Owner | Mark one read |
| `POST` | `/api/notifications/read-all` | Bearer | Mark everything read |

A room you are not a member of returns **404, not 403** — a 403 would confirm the room
exists and let anyone probe for valid room ids.

Auth endpoints are limited to **10 attempts per 15 minutes per IP**. Wrong password and
unknown email return a byte-identical `INVALID_CREDENTIALS` response, so the API cannot
be used to discover which addresses have accounts.

`/summary` *suggests* settlements from the current balances; the endpoints above
*record* them. Notifications are Phase 10. See `docs/PROJECT_SPEC.md` §32 for the
full planned surface.

### Room summary

`GET /api/rooms/:roomId/summary` returns the whole computed picture in one call —
totals, a row per member, the suggested payments, and the caller's own position.
Pass `from` and `to` to narrow the window; with neither, it covers the room's
whole history.

Two numbers on each member row look alike and are not:

| Field | Meaning |
| --- | --- |
| `balance` | `paid − owed + settled`. What this person is actually up or down. Settlements are built from it, and across everyone it always sums to exactly zero. |
| `difference` | `paid − average`. A spending comparison for the §11 table — "you put in ₹100 less than the typical person here". Display only; nothing settles against it. |

They coincide only when every expense was split equally between everybody and
nobody has settled up. Conflating them is how a dashboard ends up quoting a debt
the Settle Up page has never heard of.

`settled` is `settledOut − settledIn`: money handed over counts for you exactly
as putting money in does. It stays out of `paid` and `owed` because those mean
*spending*, and out of `difference` because paying somebody back is not
spending — counting it there would tell someone who cleared their debt that they
now spend below average.

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
| 7. Editing, revisions & soft delete | ✅ Done |
| 8. Settlements | ✅ Done |
| 9. History, search & filtering | ✅ Done |
| 10. Notifications & real-time | ✅ Done |
| 11. Responsive polish & performance | ✅ Done |
| 12. Security hardening & tests | Next |
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

## Editing and deletion

Both rules come straight from spec §8 and §9, and both are enforced in the
service — the client only decides which buttons are worth showing.

| Action | Who |
| --- | --- |
| Edit an expense | **Only the person who added it.** Not the admin, not whoever paid. |
| Remove an expense | The person who added it, **or a room admin.** |

The asymmetry is deliberate. Editing rewrites what someone said they spent, so
only they may do it; a shared ledger where anyone can restate your claim is an
argument, not a record. Deleting only withdraws the claim, and an admin has to
be able to clear a duplicate when whoever entered it has stopped replying.

**Nothing is destroyed.** An edit writes an `ExpenseRevision` — the changed
fields only, before and after, with who and when — and a delete sets
`isDeleted` / `deletedAt` / `deletedBy`, leaving the row readable and out of
every total. Revisions are never updated or deleted; a revision that could be
revised would not be an audit trail. Storing only what changed keeps a
description fix on a year-old expense to one small row, and the full state at
any past point is still recoverable by replaying backwards from the current
expense.

**The money fields move as a set.** A PATCH carrying any of `amount`,
`splitType`, `participants` or `paidBy` must carry all four. A new total against
the old custom split leaves shares that no longer add up, and the server will
not guess whose share absorbs the difference. Description, category, date and
note are patchable on their own.

**An edited split is re-frozen, not re-derived.** The new shares are resolved
once and stored, exactly as the original ones were — read-time recomputation
never happens, before or after an edit (§29).

**People who have left stay editable.** The participants allowed on an edit are
the room's current members *plus* everyone already on that expense. Without the
second half, an expense involving someone who moved out could never be corrected
again — not even its spelling.

**Two things the edit form deliberately will not do.** A percentage split loads
as its exact stored amounts, because only the resolved shares are kept and they
do not reliably invert (33.33% of ₹1,000 stores as ₹333.34, which reads back as
33.334%); showing approximate percentages would re-split the expense on save.
And an expense with several payers locks its money block rather than collapsing
to the form's single payer picker, which would move real money. Everything else
stays editable in both cases.

---

## Settling up

A settlement is a payment between two people. It **never touches an expense**
(spec §12): handing somebody ₹300 does not change what last month's shopping
cost, it changes what is outstanding between you. So it is a separate record,
and the balance engine folds it in as a transfer — `paid` and `owed` stay
strictly what the expenses say.

### The lifecycle, and who owns each step

| State | Who moves it there | Meaning |
| --- | --- | --- |
| `pending` | either party, on creating it | Recorded. Nothing has moved. |
| `paid` | **the payer** | "I have sent the money." |
| `confirmed` | **the receiver** | "It arrived." Only now does a balance move. |
| `cancelled` | either party | Withdrawn, before confirmation. |

**Only a confirmed settlement changes a balance.** If the payer could confirm
their own payment, anyone could clear a debt by asserting they had paid it — so
the one step that moves money belongs to the person who would notice if it
hadn't arrived. A room admin gets no special power here either: whether the
money turned up is a fact only the person receiving it can attest to.

**`confirmed` is terminal.** A confirmation made in error is corrected the way
ledgers correct anything — by recording the payment the other way — not by
rewriting what both people already agreed.

**`cancelled` is a fourth state the spec does not list.** Without it, a
settlement recorded by mistake sits on the Settle Up page for ever:
un-confirmable, un-removable, permanently suggesting a payment nobody intends to
make. It is a withdrawal rather than a deletion — the row stays, with who
cancelled it and when.

**Past members can settle.** Someone who moved out owing ₹300 still owes ₹300,
so settlements may name any member the room has ever had. Refusing them would
leave that debt on the books permanently.

**The reporting window does not apply to settlements.** `from`/`to` scope what
was *spent* in a period; the balance is always the balance as it stands now. A
payment made last week would otherwise vanish from a report on last month and
resurrect a debt that has been paid.

The Settle Up page keeps the two halves visibly apart. Suggestions are computed
fresh on every load and stored nowhere; history is what people actually did. A
suggestion that already has an unconfirmed payment against it says so, because
an unconfirmed payment correctly moves no balance — and without the note, that
invites paying twice.

---

## History, search and filtering

`/expenses` is the history page (spec §19). Every filter runs server-side and
the list is paginated, so the browser holds one page whatever the room contains
— a room seeded with 1,000 expenses sends **24 kB per page** and behaves exactly
like a room with ten.

| Filter | Notes |
| --- | --- |
| Search | Description and notes, case-insensitive, debounced 300ms |
| Category · Involving · Date range | As before; "involving" is either side of the transaction |
| Amount range | Typed in rupees, sent as paise |
| Split type | equal · custom · percentage |
| Edited | Only edited · never edited |
| Removed | Hide (default) · include · only |

Sort: newest, oldest, largest, smallest.

**Removed expenses are hidden by default and never reach a calculation.** History
is the one place they can be summoned, and they render dimmed, struck through and
labelled — a removed row that looked live would be actively misleading.

### Two findings from `.explain()`

**There is no text index.** `$text` matches whole stemmed words, so typing "din"
finds nothing and "dinner" finds everything — unusable behind a box that searches
as you type. The page uses a case-insensitive regex, run *inside* the room
filter: the compound index narrows to one room first and the scan happens across
those. An index nothing queries still costs a write on every expense, so the one
declared in Phase 4 is gone rather than left behind a comment.

**The sort tiebreaker has to be in the index.** The list sorts by
`{date, createdAt}` so two expenses dated the same day keep a stable order — but
the index stopped at `date`, which let Mongo satisfy the *filter* and then sort
the whole matching set in memory. `.explain()` over 1,000 expenses showed **961
documents examined to return 20**. Appending `createdAt` brings it to 20. This is
a correctness cliff as much as a speed one: past 32MB of matches Mongo stops
sorting in memory and fails the query outright.

Verified plans, all index-backed with no in-memory sort:

| Query | Index | Examined |
| --- | --- | --- |
| Default list | `room, isDeleted, date, createdAt` | 20 |
| Sorted by amount | `room, isDeleted, amount` | 20 |
| One category | `room, isDeleted, date, createdAt` | 239 |
| Date range | `room, isDeleted, date, createdAt` | 20 |
| Involving one person | `room, isDeleted, date, createdAt` | 25 |
| Text search | `room, isDeleted, date, createdAt` | 276 |

> **Upgrading an existing database:** removing an index from a Mongoose schema
> does not drop it from Mongo. A database created before this change still
> carries `description_text_notes_text`, a bare `room_1`, and the shorter
> `room_1_isDeleted_1_date_-1`. Drop those three by hand once; Mongoose creates
> the replacements on boot.

---

## Notifications

Every notification is raised **from the service layer**, never from a controller
— which is the whole reason spec §30's real-time updates can be added later
without restructuring anything. Whatever transport eventually pushes these
subscribes at the one place that already knows an event happened and who it
concerns. A controller emitting them would mean every new caller of a service
silently stopped notifying anybody.

| Event | Who hears about it |
| --- | --- |
| Expense added / edited / removed | Every active member except whoever did it |
| Member joined | Everyone already in the room |
| Settlement recorded / sent / confirmed / cancelled | **Only the other party** |

A settlement is between two people; telling the other three about money that is
not theirs is noise.

**One row per recipient, not one per event.** Fan-out costs a handful of small
documents and buys two things worth more than the saving: `read` belongs to a
person rather than an event, and the wording is personal. The same expense reads
"Alok added ₹4,000 — your share is ₹1,333.34" to someone in the split and
"…You are not in this one." to someone who was left out — the number that
matters is your share, not the total.

**Messages are frozen at write time.** "Rahul added an expense of ₹500" stays
correct after the expense is edited to ₹650 or removed, which is what a note
about that moment should say.

**Raising a notification can never fail the thing that caused it.** An expense
that saved must not report failure because a notification insert timed out; the
worst case is somebody misses a line in their bell.

**They prune themselves** after 90 days, via a TTL index. Notifications are not
the audit trail — expenses keep revisions and settlements keep their stamps,
both permanent — so this is the one collection that would otherwise grow for
ever while nobody reads the old end of it.

### No Socket.IO, and why

Spec §30 asks for real-time "if practical". **It is not practical on the
intended deployment target.** Vercel's serverless functions cannot hold an open
WebSocket — there is no process for the connection to live in between
invocations — so a Socket.IO server there either fails or silently degrades to
long-polling through a function that bills per invocation.

So the client polls instead, and it is deliberately cheap:

- it polls the **count**, not the list — one number the server answers from an
  index without reading a document;
- it **stops entirely while the tab is hidden**, and checks immediately on
  becoming visible again, so returning to a tab is not a wait;
- the list is fetched only when the menu is opened.

A second browser learns about an expense within one poll — 30 seconds, or
immediately on refocusing the tab. Verified live: bell went 6 → 7 unread without
a page refresh.

**If the API ever moves somewhere that can hold a connection** (Render, Fly, a
container), adding sockets is a change in one file: `notification.service.js`
already knows the room, the recipients and the payload. Nothing else moves.

### Deferred

Spec §20's "You have ₹300 pending to settle." is a digest, not an event — it
needs a scheduled job rather than a service hook, so it is not here. The bell
covers everything that *happens*; the Settle Up page covers what is outstanding.

---

## Responsive and performance

### Route splitting

Every page is a `React.lazy` import (spec §24). One bundle meant a visitor
downloaded the charting library to read a login form.

| | Before | After |
| --- | --- | --- |
| Initial download | **716 kB** / 215 kB gzipped | **242 kB** / 82 kB gzipped |
| Login page | the whole app | + 2 kB |
| Dashboard | — | + 406 kB, only when opened |

A 62% cut on first load, and the 400 kB of Recharts is now paid for only by
people who open the dashboard.

The fallback between routes renders **nothing for the first 200ms**. On a warm
cache a chunk arrives in a few milliseconds, and a spinner that appears and
vanishes inside one frame reads as a flicker — worse than the brief blank it
replaced.

### Mobile layouts, not a shrunk desktop (spec §22)

**The navigation moves, it does not compress.** On a wide screen the links sit
in the header. On a phone they move to a fixed bottom bar — inside the thumb's
reach, which the top of a 6-inch screen is not. It clears the iOS home indicator
via `env(safe-area-inset-bottom)`; without that the last few pixels of it are
unreachable on any modern iPhone.

**The comparison table becomes cards.** Five columns of currency at 360px is
either a horizontal scroll nobody discovers or a set of columns dropped to make
room — and the dropped ones are exactly the figures that make the balance
checkable. Below `sm` the same rows render as cards: name and balance on top,
the workings underneath as labelled pairs.

Verified at **360px**: no page scrolls sideways, every bottom-nav target is
59px tall (44px is the accessible minimum), and the dashboard renders no
`<table>` at all.

### The splash screen

Shown only when there is genuinely something to wait for. The app re-fetches the
signed-in user on boot rather than trusting a cached copy, and on a slow
connection that is a second of blank page worth filling — but it renders nothing
for the first 250ms, so a fast session check goes straight through to the
dashboard. A fixed 1–2 second splash would be an animation charged to every page
load, in the same phase whose other half is about making the app faster.

### Toasts

For things that **worked**. A failure that needs the user to act belongs next to
the thing that failed — an error four inches away that disappears after four
seconds is worse than none. So `toast.success` and `toast.info` carry outcomes,
and `toast.error` is reserved for the case where the page the action happened on
has already been left behind.

The live region exists in the DOM before anything enters it (a region created at
the same moment as its content announces nothing), and it sits above the mobile
bottom bar so it never covers the navigation.

### Accessibility (spec §37)

Verified by driving the app with the keyboard alone:

- the **first Tab stop is a skip link**, which becomes visible on focus and
  jumps past the navigation to `#main`;
- **every focused control shows a visible focus ring** — checked by tabbing
  through and reading `outline-width` off each one in turn;
- the notification menu **opens from the keyboard and closes on Escape**;
- icons are `aria-hidden` with the label beside them carrying the meaning, so
  nothing is announced twice, and the icon-only logout button on mobile has an
  `aria-label`;
- `prefers-reduced-motion` disables every animation and transition.

---

## Notes on dependency choices

- **Express 4, not 5** — Express 5 makes `req.query` a getter, which breaks several
  common security middlewares. Express 4 is fully supported and the whole ecosystem
  works with it.
- **Tailwind v4** — configured in CSS via `@theme` in `src/index.css` and the
  `@tailwindcss/vite` plugin. There is deliberately no `tailwind.config.js` or
  `postcss.config.js`; v4 does not use them.
- **Recharts** — the single largest thing in the app at ~400 kB, almost all of
  it Recharts and its D3 dependencies. It is no longer in the initial bundle:
  the dashboard route is lazy, so it downloads only for people who open the
  dashboard. See **Responsive and performance** below.
