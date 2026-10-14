# OverIt Backoffice API contract

Backend: `OverIt-Backend` (branch `feat/backoffice`). Every endpoint below lives under
`/api/backoffice` unless stated otherwise. This file is the source of truth for the
frontend; it is kept in sync with the implementation.

## Conventions

- **Auth.** `Authorization: Bearer <accessToken>` where the token comes from
  `POST /api/dashboard/auth/admin/login` (existing). Policy `Backoffice.Admin`
  (dashboard token + `Admin` role). Missing/invalid token → `401`; creator token → `403`.
- **JSON.** camelCase. Enums are strings (exact casing shown below). Dates are ISO-8601 UTC
  (`"2026-10-13T12:00:00Z"`); day keys are `"YYYY-MM-DD"` (UTC day).
- **CORS.** `http://localhost:3000` is allowed in Development/Local.
- **Paging.** `?page=1&pageSize=20` (pageSize clamped to 1..100). Paged responses:

```ts
type Paged<T> = { items: T[]; page: number; pageSize: number; totalCount: number; totalPages: number };
```

- **Errors.** Domain errors: `{ errorCode: string; message: string; traceId: string }` with
  4xx status (`404 DASHBOARD_NOT_FOUND`, `409 ...`, `400 ...`). FluentValidation errors (empty or
  too long fields): `400 { statusCode: 400; message: "Validation failed."; errors: { propertyName: string; errorMessage: string }[] }`.
  Malformed JSON or an unknown enum string is rejected by ASP.NET before that, as a standard
  ProblemDetails body: `400 { title: string; status: 400; errors: Record<string, string[]> }`.
- **Audit.** Every mutation (`POST/PUT/PATCH/DELETE`) writes an audit entry (see Audit log).
- **Filters.** Metrics take `range=7|30|90|all` (default `all`). `overview` and `onboarding` also take
  `country` (ISO 3166-1 alpha-2) and `language` (`es`|`en`); the other metrics ignore them.

```ts
type Range = "7" | "30" | "90" | "all";
type Gender = "MALE" | "FEMALE" | "OTHER" | "NON_BINARY" | "PREFER_NOT_TO_SAY";
type UserStatus = "PENDING_ONBOARDING" | "PENDING_SECOND_ONBOARDING" | "ACTIVE";
type Emotion = "MELANCHOLY" | "ANGER" | "NEUTRAL" | "SADNESS" | "HAPPINESS";
// Subscription state *today*:
//  renews             = active and will renew
//  canceledWithAccess = active, auto-renew off (still has paid access until expiresAt)
//  canceled           = no access, the user turned auto-renew off before it lapsed
//  expired            = no access, lapsed without an explicit cancel (billing issue, etc.)
//  none               = never purchased (complimentary grants are reported separately)
type SubscriptionBucket = "renews" | "canceledWithAccess" | "canceled" | "expired" | "none";
```

---

## 1. Users

### `GET /api/backoffice/users`

Query:

| param | values |
|---|---|
| `search` | free text; matches name, email (contains, case-insensitive) or exact user id (GUID) |
| `onboarding` | `completed` (status ACTIVE) · `partial` (PENDING_SECOND_ONBOARDING) · `pending` (PENDING_ONBOARDING) · `notCompleted` (pending + partial) |
| `subscription` | a `SubscriptionBucket`, or `renewsThisWeek` (renews and expiresAt within 7 days), or `grant` (active complimentary access) |
| `country` | ISO 3166-1 alpha-2 (upper case) |
| `language` | `es` · `en` |
| `leftAt` | onboarding screen id: people with an account whose onboarding stopped on that screen |
| `question`, `answer` | both together: users whose onboarding answer to `question` includes `answer` (exact strings as in `onboardingAnswers`); `question=breakupMotives` filters by the second-part motives |
| `sort` | `createdAt` (default, desc) · `name` · `email` · `lastLogin` · `age` · `expiresAt` |
| `desc` | `true`/`false` (default depends on column: text asc, dates desc) |
| `page`, `pageSize` | paging |

Response `Paged<UserListItem>`:

```ts
type UserListItem = {
  id: string;
  email: string;
  name: string | null;
  age: number | null;
  gender: Gender | null;
  imageUrl: string | null;
  status: UserStatus;
  onboardingCompleted: boolean;     // status === "ACTIVE"
  createdAt: string | null;         // first sign-up; null for very old rows without an account date
  lastLogin: string;
  lastDevice: string | null;
  country: string | null;           // ISO alpha-2, from the app's X-Country header (refreshed on login and token refresh)
  language: string | null;          // "es" | "en", the app language from Accept-Language (same refresh)
  providers: ("GOOGLE" | "APPLE")[];
  subscription: {
    bucket: SubscriptionBucket;
    productId: string | null;
    store: string | null;            // e.g. "APP_STORE"
    expiresAt: string | null;
    willRenew: boolean;
  };
  hasActiveGrant: boolean;          // complimentary access by staff
  hasAccess: boolean;               // premium today (subscription or grant)
};
```

### `GET /api/backoffice/users/countries`

`{ country: string; users: number }[]` — every country with at least one user (all time), most users first.
For the country filter; names come from `Intl.DisplayNames(["es"], { type: "region" })`.

### `GET /api/backoffice/users/{id}`

`404` if missing. Response:

```ts
type UserDetail = {
  id: string; email: string; name: string | null; age: number | null; gender: Gender | null;
  imageUrl: string | null; profilePic: string | null; status: UserStatus;
  createdAt: string | null; lastLogin: string; lastDevice: string | null;
  country: string | null; language: string | null;   // as in UserListItem
  providers: ("GOOGLE" | "APPLE")[];

  // Privacy: the ex's name and the future-me message text are NEVER returned.
  onboarding: null | {
    answers: Record<string, string[]>;   // question key -> chosen answers, as the app sent them
    hasExName: boolean;
    futureMessageLength: number | null;  // characters; null if not written
    breakupMotives: string[];
    commitmentSignedAt: string | null;
  };

  subscription: null | {
    bucket: SubscriptionBucket;
    productId: string | null; store: string | null; periodType: string | null; environment: string | null;
    isActive: boolean; willRenew: boolean;
    firstSeenAt: string;                 // when the backend first mirrored it (≈ first purchase)
    latestPurchaseAt: string | null;     // last charge (purchase or renewal)
    expiresAt: string | null;
    unsubscribeDetectedAt: string | null;
    billingIssueDetectedAt: string | null;
  };
  hasAccess: boolean;
  payments: { paymentId: string; eventType: "INITIAL_PURCHASE" | "RENEWAL" | "NON_RENEWING_PURCHASE";
              productId: string | null; store: string | null; periodType: string | null; environment: string | null;
              amountLocal: number; currency: string;   // what the person paid, in their currency
              amountUsd: number; netUsd: number;       // RevenueCat's USD estimate; net = after tax and store commission
              purchasedAt: string; refundedAt: string | null }[];   // newest first; sandbox rows included (see environment)
  grants: { grantId: string; reason: string; startsAt: string; expiresAt: string | null;
            revokedAt: string | null; status: "Active" | "Expired" | "Revoked"; createdAt: string }[];

  plan: null | {                          // current counter (the app keeps one plan; a reset replaces it)
    startedAt: string;                    // counter running since
    finishDate: string;
    movedOnAt: string | null;             // "Superé a..."
    currentDay: number;                   // 1-based
    totalDays: number;                    // 90
  };

  emotions: { date: string; emotion: Emotion }[];                  // ascending
  challenges: { date: string; challengeId: string; title: string; day: number;
                completed: boolean; completedAt: string | null }[]; // ascending
  resourceReads: { resourceId: string; title: string; category: string; type: "Article" | "Tip"; readAt: string }[];

  community: {
    posts: number; comments: number; removedPosts: number; removedComments: number;
    likesGiven: number; reportsMade: number; reportsReceived: number;
    blockedUsers: number; blockedBy: number;
  };

  // Counts only, never message text.
  chat: {
    userMessages: number; assistantMessages: number; conversations: number;
    voiceCalls: number; voiceSeconds: number;
    perDay: { date: string; userMessages: number; assistantMessages: number }[];
  };

  feedbackCount: number;
};
```

### `PATCH /api/backoffice/users/{id}`

Changes the visible name (the account itself is untouched).
Body `{ name: string }` (1..50 chars after trim; formatted like the app does, e.g. "ana maría" → "Ana María").
`204`; `404` if missing; `400` validation.

---

## 2. Metrics

All accept `range` (default `all`). Cohort metrics count users **created** in the range;
event metrics count events **that happened** in the range. Every `perDay`/`activePerDay` series is
continuous: one entry per UTC day from the start of the range (or the first day with data for `all`)
through today, with zeros on days without activity.

### `GET /api/backoffice/metrics/overview?range=&country=&language=`

`country`/`language` filter the cohort (`funnel`, `perDay`, `breakdowns`, `onboardingAnswers`,
`breakupMotives`); `subscriptions`, `mrrEstimate` and `collected` stay global.

```ts
type Overview = {
  range: Range; from: string | null; to: string;
  funnel: {
    downloads: number;            // users created in range (sign-up; there is no install event)
    onboardingCompleted: number;  // of those, status ACTIVE
    subscribed: number;           // of those, ever purchased
    withAccessToday: number;      // of those, premium today (subscription or grant)
  };
  perDay: { date: string; downloads: number; subscribed: number }[]; // subscribed = first purchase that day (any cohort)
  subscriptions: { active: number; renewing: number; canceledWithAccess: number };
  mrrEstimate: MrrEstimate | null;   // null when nothing renews
  collected: Collected;               // charges in range
  breakdowns: {
    gender: { key: Gender | "UNKNOWN"; users: number; subscribed: number }[];
    age:    { key: "<18" | "18-24" | "25-34" | "35-44" | "45-54" | "55+" | "UNKNOWN"; users: number; subscribed: number }[];
    language: { key: string; users: number; subscribed: number }[];   // "es" | "en" | "UNKNOWN", most users first
    country:  { key: string; users: number; subscribed: number }[];   // ISO alpha-2 | "UNKNOWN", most users first
  };
  onboardingAnswers: { question: string; answered: number; options: { answer: string; count: number }[] }[];
  breakupMotives: { answer: string; count: number }[];
};
```

Prices come from RevenueCat webhooks (they vary by country): every `INITIAL_PURCHASE`, `RENEWAL` and
`NON_RENEWING_PURCHASE` is stored as a payment (idempotent by transaction id; `REFUND` or a cancellation
with reason `REFUND` marks it refunded). Sandbox payments are stored but left out of every metric.

```ts
// MRR: each renewing (non-sandbox) subscription's last charge in USD, normalized to a month by the
// days that charge paid for (purchase → expiration; guessed from the product id if unknown).
type MrrEstimate = { amount: number; netAmount: number; currency: "USD"; unpriced: number;  // renewing with no known charge
  byProduct: { productId: string; renewing: number; monthlyPrice: number | null }[] };      // monthlyPrice = average USD/month
type Collected = { grossUsd: number; netUsd: number; payments: number;                    // refunded charges excluded
  refundedUsd: number; refunds: number;
  byCurrency: { currency: string; amount: number; amountUsd: number; payments: number }[] };
```

### `GET /api/backoffice/metrics/onboarding?range=&country=&language=`

Per-screen onboarding funnel, built from the screen events the app sends (`POST /api/onboarding/screens`, anonymous
allowed; events are linked to the account once the person signs in). `range` filters by each install's first
screen view; `country`/`language` use the headers sent with the events. Screens before `plan` happen before
sign-up, so they count installs, not accounts.

```ts
type OnboardingFunnel = {
  devices: number;                // installs whose first onboarding screen view falls in the range
  screens: {
    screen: string;               // the app's screen id ("opening", "hurts", ..., "paywall")
    reached: number;              // installs that saw it
    skipped: number;              // left it with "Saltar"
    left: number;                 // last screen and never left it (closed the app there, or still there)
    leftWithAccount: number;      // of `left`, linked to an account (list them: GET /users?leftAt=<screen>)
    medianSeconds: number | null; // median time on the screen (visits that ended)
  }[];                            // one row per screen with data, unordered
};
```

### `GET /api/backoffice/metrics/subscriptions?range=`

Counts are the state **today**; `perDay` follows `range`.

```ts
type SubscriptionsMetrics = {
  counts: { renews: number; renewsThisWeek: number; canceledWithAccess: number; canceled: number;
            expired: number; activeGrants: number };
  mrrEstimate: Overview["mrrEstimate"];
  collected: Overview["collected"];
  byProduct: { productId: string; active: number; renewing: number }[];
  perDay: { date: string; new: number; canceled: number }[]; // new = first mirrored purchase; canceled = unsubscribe detected
  cancelReasons: { total: number; recent: { feedbackId: string; userId: string | null; at: string; message: string }[] };
  firstRenewal: { eligible: number; renewed: number; rate: number | null }; // approximation, see notes
};
```

Lists per bucket: use `GET /users?subscription=<bucket>&sort=expiresAt`.

### `GET /api/backoffice/metrics/usage?range=`

```ts
type UsageMetrics = {
  activePerDay: { date: string; users: number }[]; // distinct users with any tracked action that day
  features: {
    key: "emotions" | "challengesCompleted" | "resourceReads" | "phraseFavorites" | "chatMessages"
       | "voiceCalls" | "posts" | "comments" | "postLikes" | "commentLikes";
    events: number; users: number;
  }[];
  emotions: { emotion: Emotion; count: number }[];
  perDay: { date: string; emotions: number; challengesCompleted: number; resourceReads: number;
            chatMessages: number; posts: number; comments: number }[];
};
```

### `GET /api/backoffice/metrics/ninety?range=`

```ts
type NinetyMetrics = {
  totals: { userMessages: number; assistantMessages: number; users: number; conversations: number;
            voiceCalls: number; voiceMinutes: number };
  perDay: { date: string; userMessages: number; users: number }[];
  perHour: { hour: number; userMessages: number }[];   // 0..23, UTC
  topUsers: { userId: string; name: string | null; email: string | null; userMessages: number; lastMessageAt: string }[]; // top 20
};
```

---

## 3. Moderation

A post/comment is **in review** when it is not removed and has at least one report that is
not `Resolved`, or has a `flag` and was never reviewed. Removing, restoring or dismissing ("no infringe")
resolves its open reports; dismissing also sets `reviewedAt` (the flag stays).
Removed content is hidden from the app (feed, post detail, comments, counts).

### `GET /api/backoffice/moderation/posts`
### `GET /api/backoffice/moderation/comments`

Query: `status=review|all|deleted|any` (default `review`; `all` = not removed; `any` = removed or not),
`search` (text, author name/email), `userId` (author), `postId` (comments only: the comments of one post),
`page`, `pageSize`. Ordered newest first (review: `SelfHarm` flag first, then most open reports, then newest).

```ts
type ModerationReport = { reportId: string; reporterId: string; reason: "Spam" | "Harassment" | "Hate" | "Inappropriate" | "SelfHarm" | "Other";
                          details: string | null; status: InboxStatus; at: string };
type ModerationPost = {
  id: string; text: string; language: string; isAnonymous: boolean; createdAt: string;
  author: { id: string; name: string | null; email: string };
  likes: number; comments: number;
  reports: number; openReports: number; reportsDetail: ModerationReport[];
  removedAt: string | null; removedByAdminId: string | null; removalReason: string | null;
  reviewedAt: string | null;           // last "no infringe"
  // Set by the AI moderator at publish time for text it let through but wants a person to look at.
  flag: "Harassment" | "Hate" | "Sexual" | "Violence" | "SelfHarm" | "Spam" | "PersonalData" | "Other" | null;
};
type ModerationComment = Omit<ModerationPost, "comments" | "isAnonymous" | "language"> & {
  postId: string; postText: string;
};
```

### `GET /api/backoffice/moderation/counts`

`{ postsToReview: number; commentsToReview: number; postsAtRisk: number; commentsAtRisk: number; inboxNew: number }`
— for badges. `*ToReview` include flagged items; `*AtRisk` = in review with a `SelfHarm` flag.

### Actions

All `204`; `404` if missing; `409 DASHBOARD_ALREADY_REMOVED` (remove twice, or dismiss removed
content) / `409 DASHBOARD_NOT_REMOVED` (restore something not removed). Every action also sets
the open reports on that post/comment to `Resolved` and writes an audit entry.

| method + path | body |
|---|---|
| `POST /moderation/posts/{id}/remove` | `{ reason?: string }` (≤500) |
| `POST /moderation/posts/{id}/restore` | – |
| `POST /moderation/posts/{id}/dismiss` | – ("no infringe": resolves open reports) |
| `POST /moderation/comments/{id}/remove` | `{ reason?: string }` |
| `POST /moderation/comments/{id}/restore` | – |
| `POST /moderation/comments/{id}/dismiss` | – |

Changing someone's visible name: `PATCH /users/{id}`.

---

## 4. Inbox (reports + feedback)

```ts
type InboxStatus = "New" | "InReview" | "Resolved";   // design: nuevo | revision | resuelto
type InboxType = "report" | "bug" | "suggestion" | "other" | "subscriptionCancellation" | "accountDeletion";
type InboxItem = {
  id: string;
  source: "report" | "feedback";
  type: InboxType;
  status: InboxStatus;
  at: string;
  user: null | { id: string; name: string | null; email: string };  // null: anonymous feedback or deleted account
  message: string;                      // feedback message, or report details (may be "")
  reason: string | null;                // reports only (ReportReason)
  section: string | null; contactOk: boolean;
  appVersion: string | null; device: string | null; locale: string | null; // feedback only
  target: null | { kind: "post" | "comment"; postId: string; commentId: string | null;
                   text: string; authorId: string; removed: boolean; reports: number };
};
```

### `GET /api/backoffice/inbox`

Query: `type` (InboxType), `status` (InboxStatus), `search` (message / user name / email),
`page`, `pageSize`. Newest first. Response `Paged<InboxItem>`.

### `GET /api/backoffice/inbox/counts`

All tab and chip counters in one request:

```ts
type InboxCounts = {
  byStatus: Record<InboxStatus | "all", number>;
  byType: Record<InboxStatus | "all", Record<InboxType, number>>;   // every type present (0 included)
};
```

### `PATCH /api/backoffice/inbox/{source}/{id}`

`source` = `report` | `feedback`. Body `{ status: InboxStatus }`. `204`; `404` for an unknown id
or source; `400` (ProblemDetails) for an unknown status string.

---

## 5. Audit log

### `GET /api/backoffice/audit`

Query: `search` (summary, action, target id, admin email), `action`, `targetType`, `page`, `pageSize`.

```ts
type AuditEntry = {
  id: string; at: string;
  admin: { id: string; name: string | null; email: string | null };
  action: string;       // e.g. "user.rename", "post.remove", "post.restore", "post.dismiss", "comment.remove",
                        // "inbox.status", "challenge.create", "challenge.update", "challenge.delete", "challenge.reorder", ...
  targetType: string;   // "user" | "post" | "comment" | "report" | "feedback" | "challenge" | "breathing" | "resource" | "phrase" | "scientificFact"
  targetId: string | null;
  summary: string;      // human readable, Spanish-neutral, no private text
};
```

---

## 6. Removed from the mobile API

`POST`/`DELETE` on `/api/challenges`, `/api/breathings`, `/api/resources`, `/api/phrases`,
`/api/scientific-facts` (they were behind the paywall policy and unused by the app).

---

## Not available (the backend cannot provide it today)

| Design wants | Why |
|---|---|
| Installs ("descargas") outside the onboarding | `metrics/onboarding` counts installs that opened the onboarding; `downloads` in the overview = users created (sign-up). |
| Payments before webhooks were stored | Payments are built from stored RevenueCat webhooks (backfilled once at startup); older charges are unknown. Refund actions are out of scope. |
| Exact MRR in local currencies | MRR uses RevenueCat's USD estimate of each subscription's last charge. |
| Exact first-renewal rate | Approximated: `renewed` = latest purchase at least 20 days after first mirrored purchase. |
| Cancel reason per subscription | Only free-text feedback of type `SubscriptionCancellation`, not linked to the RevenueCat event. |
| Counter reset history, resets from panic button, panic-button opens, breathings completed, app opens, letters, future-message events | No events stored; a reset replaces the plan row. |
| Reading a user's Ninety conversation | Deliberately not exposed (privacy). Only counts. |
| Challenge "who completes it" by plan day, people per day today | Only `activeUsersToday` per challenge. |
| Phrase/fact daily rotation in list order | The app picks a random published item per day; order only affects the backoffice list. |
| Screenshot attachments on feedback | Not stored. |
| Roles other than Admin | Single `Admin` role; policy `Backoffice.Admin` is the extension point. |
