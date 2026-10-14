/*
 * Wire types for the Tracking endpoints of /api/backoffice (see docs/API.md, sections 1 and 2). Server shape, camelCase.
 */

export type MetricsRange = "7" | "30" | "90" | "all";
export type Gender = "MALE" | "FEMALE" | "OTHER" | "NON_BINARY" | "PREFER_NOT_TO_SAY";
export type UserStatus = "PENDING_ONBOARDING" | "PENDING_SECOND_ONBOARDING" | "ACTIVE";
export type Emotion = "MELANCHOLY" | "ANGER" | "NEUTRAL" | "SADNESS" | "HAPPINESS";
export type SubscriptionBucket = "renews" | "canceledWithAccess" | "canceled" | "expired" | "none";
export type Provider = "GOOGLE" | "APPLE";

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/* ─────────── Users ─────────── */

export type OnboardingFilter = "completed" | "partial" | "pending" | "notCompleted";
export type SubscriptionFilter = SubscriptionBucket | "any" | "active" | "renewsThisWeek" | "grant";
export type UserSort =
  | "createdAt"
  | "name"
  | "email"
  | "lastLogin"
  | "age"
  | "onboarding"
  | "country"
  | "language"
  | "product"
  | "subscribedAt"
  | "expiresAt"
  | "subscription";

export interface UserListItem {
  id: string;
  email: string;
  name: string | null;
  age: number | null;
  gender: Gender | null;
  imageUrl: string | null;
  status: UserStatus;
  onboardingCompleted: boolean;
  createdAt: string | null;
  lastLogin: string;
  lastDevice: string | null;
  country: string | null;
  language: string | null;
  providers: Provider[];
  subscription: {
    bucket: SubscriptionBucket;
    productId: string | null;
    store: string | null;
    subscribedAt: string | null;
    expiresAt: string | null;
    willRenew: boolean;
  };
  hasActiveGrant: boolean;
  hasAccess: boolean;
}

export interface UserGrant {
  grantId: string;
  reason: string;
  startsAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  status: "Active" | "Expired" | "Revoked";
  createdAt: string;
}

export interface UserDetail {
  id: string;
  email: string;
  name: string | null;
  age: number | null;
  gender: Gender | null;
  imageUrl: string | null;
  profilePic: string | null;
  status: UserStatus;
  createdAt: string | null;
  lastLogin: string;
  lastDevice: string | null;
  country: string | null;
  language: string | null;
  providers: Provider[];
  onboarding: null | {
    answers: Record<string, string[]>;
    exName: string | null;
    futureMessage: string | null;
    breakupMotives: string[];
    commitmentSignedAt: string | null;
  };
  subscription: null | {
    bucket: SubscriptionBucket;
    productId: string | null;
    store: string | null;
    periodType: string | null;
    environment: string | null;
    isActive: boolean;
    willRenew: boolean;
    firstSeenAt: string;
    latestPurchaseAt: string | null;
    expiresAt: string | null;
    unsubscribeDetectedAt: string | null;
    billingIssueDetectedAt: string | null;
  };
  hasAccess: boolean;
  grants: UserGrant[];
  payments: UserPayment[];
  plan: null | {
    startedAt: string;
    finishDate: string;
    movedOnAt: string | null;
    currentDay: number;
    totalDays: number;
  };
  emotions: { date: string; emotion: Emotion }[];
  challenges: {
    date: string;
    challengeId: string;
    title: string;
    day: number;
    completed: boolean;
    completedAt: string | null;
  }[];
  resourceReads: { resourceId: string; title: string; category: string; type: "Article" | "Tip"; readAt: string }[];
  community: {
    posts: number;
    comments: number;
    removedPosts: number;
    removedComments: number;
    likesGiven: number;
    reportsMade: number;
    reportsReceived: number;
    blockedUsers: number;
    blockedBy: number;
  };
  chat: {
    userMessages: number;
    assistantMessages: number;
    conversations: number;
    voiceCalls: number;
    voiceSeconds: number;
    perDay: { date: string; userMessages: number; assistantMessages: number }[];
  };
  feedbackCount: number;
}

/* ─────────── Metrics ─────────── */

/** MRR in USD from each renewing subscription's last RevenueCat charge, normalized to a month. */
export interface MrrEstimate {
  amount: number;
  netAmount: number;
  currency: string;
  /** Renewing subscriptions with no known charge yet (left out of the amount). */
  unpriced: number;
  byProduct: { productId: string; renewing: number; monthlyPrice: number | null }[];
}

/** Charges in the range (production only, refunds left out of the totals). */
export interface Collected {
  grossUsd: number;
  netUsd: number;
  payments: number;
  refundedUsd: number;
  refunds: number;
  byCurrency: { currency: string; amount: number; amountUsd: number; payments: number }[];
}

export interface UserPayment {
  paymentId: string;
  eventType: "INITIAL_PURCHASE" | "RENEWAL" | "NON_RENEWING_PURCHASE";
  productId: string | null;
  store: string | null;
  periodType: string | null;
  environment: string | null;
  amountLocal: number;
  currency: string;
  amountUsd: number;
  netUsd: number;
  purchasedAt: string;
  refundedAt: string | null;
}

export type AgeKey = "<18" | "18-24" | "25-34" | "35-44" | "45-54" | "55+" | "UNKNOWN";

export interface Overview {
  range: MetricsRange;
  from: string | null;
  to: string;
  funnel: { downloads: number; onboardingCompleted: number; subscribed: number; withAccessToday: number };
  perDay: { date: string; downloads: number; subscribed: number }[];
  subscriptions: { active: number; renewing: number; canceledWithAccess: number };
  mrrEstimate: MrrEstimate | null;
  collected: Collected;
  breakdowns: {
    gender: { key: Gender | "UNKNOWN"; users: number; subscribed: number }[];
    age: { key: AgeKey; users: number; subscribed: number }[];
    language: { key: string; users: number; subscribed: number }[];
    country: { key: string; users: number; subscribed: number }[];
  };
  onboardingAnswers: { question: string; answered: number; options: { answer: string; count: number }[] }[];
}

export interface BreakupMotivesEntry {
  userId: string;
  name: string | null;
  email: string;
  status: UserStatus;
  createdAt: string | null;
  motives: string[];
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "User" | "Assistant";
  content: string;
  createdAt: string;
}

export interface CountryUsers {
  country: string;
  users: number;
}

/** Per-screen onboarding funnel: installs (anonymous before "plan"), screens unordered. */
export interface OnboardingFunnel {
  devices: number;
  screens: {
    screen: string;
    reached: number;
    skipped: number;
    left: number;
    leftWithAccount: number;
    medianSeconds: number | null;
  }[];
}

export interface SubscriptionsMetrics {
  counts: {
    renews: number;
    renewsThisWeek: number;
    canceledWithAccess: number;
    canceled: number;
    expired: number;
    activeGrants: number;
  };
  mrrEstimate: MrrEstimate | null;
  collected: Collected;
  byProduct: { productId: string; active: number; renewing: number }[];
  perDay: { date: string; new: number; canceled: number }[];
  cancelReasons: { total: number };
  firstRenewal: { eligible: number; renewed: number; rate: number | null };
}

export interface CancelReason {
  feedbackId: string;
  userId: string | null;
  at: string;
  message: string;
}

export type FeatureKey =
  | "emotions"
  | "challengesCompleted"
  | "resourceReads"
  | "phraseFavorites"
  | "chatMessages"
  | "voiceCalls"
  | "posts"
  | "comments"
  | "postLikes"
  | "commentLikes";

export interface UsageMetrics {
  activePerDay: { date: string; users: number }[];
  features: { key: FeatureKey; events: number; users: number }[];
  emotions: { emotion: Emotion; count: number }[];
  perDay: {
    date: string;
    emotions: number;
    challengesCompleted: number;
    resourceReads: number;
    chatMessages: number;
    posts: number;
    comments: number;
  }[];
}
