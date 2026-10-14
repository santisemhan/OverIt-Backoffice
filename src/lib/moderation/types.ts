/* Wire types for Moderation (docs/API.md §2 Ninety, §3 Moderation, §4 Inbox, §5 Audit). Server shape, camelCase. */

export type InboxStatus = "New" | "InReview" | "Resolved";
export type InboxType = "report" | "bug" | "suggestion" | "other" | "subscriptionCancellation" | "accountDeletion";
export type ReportReason = "Spam" | "Harassment" | "Hate" | "Inappropriate" | "SelfHarm" | "Other";
export type ModerationFlag =
  "Harassment" | "Hate" | "Sexual" | "Violence" | "SelfHarm" | "Spam" | "PersonalData" | "Other";
export type ModerationStatus = "review" | "all" | "deleted" | "any";
export type ModerationKind = "posts" | "comments";

export interface ModerationReport {
  reportId: string;
  reporterId: string;
  reason: ReportReason;
  details: string | null;
  status: InboxStatus;
  at: string;
}

export interface ModerationAuthor {
  id: string;
  name: string | null;
  email: string;
}

export interface ModerationPost {
  id: string;
  text: string;
  language: string;
  isAnonymous: boolean;
  createdAt: string;
  author: ModerationAuthor;
  likes: number;
  comments: number;
  reports: number;
  openReports: number;
  reportsDetail: ModerationReport[];
  removedAt: string | null;
  removedByAdminId: string | null;
  removalReason: string | null;
  reviewedAt: string | null;
  flag: ModerationFlag | null;
}

export type ModerationComment = Omit<ModerationPost, "comments" | "isAnonymous" | "language"> & {
  postId: string;
  postText: string;
};

export interface ModerationCounts {
  postsToReview: number;
  commentsToReview: number;
  postsAtRisk: number;
  commentsAtRisk: number;
  inboxNew: number;
}

export interface InboxItem {
  id: string;
  source: "report" | "feedback";
  type: InboxType;
  status: InboxStatus;
  at: string;
  user: null | ModerationAuthor;
  message: string;
  reason: string | null;
  section: string | null;
  contactOk: boolean;
  appVersion: string | null;
  device: string | null;
  locale: string | null;
  target: null | {
    kind: "post" | "comment";
    postId: string;
    commentId: string | null;
    text: string;
    authorId: string;
    removed: boolean;
    reports: number;
  };
}

export interface AuditEntry {
  id: string;
  at: string;
  admin: { id: string; name: string | null; email: string | null };
  action: string;
  targetType: string;
  targetId: string | null;
  summary: string;
}

export interface NinetyMetrics {
  totals: {
    userMessages: number;
    assistantMessages: number;
    users: number;
    conversations: number;
    voiceCalls: number;
    voiceMinutes: number;
  };
  perDay: { date: string; userMessages: number; users: number }[];
  perHour: { hour: number; userMessages: number }[];
}

export interface NinetyTopUser {
  userId: string;
  name: string | null;
  email: string | null;
  userMessages: number;
  lastMessageAt: string;
}

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/** GET inbox/counts: tab and chip counters in one request. */
export interface InboxCounts {
  byStatus: Record<InboxStatus | "all", number>;
  byType: Record<InboxStatus | "all", Record<InboxType, number>>;
}
