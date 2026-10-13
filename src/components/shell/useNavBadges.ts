"use client";

import { useModerationCounts } from "@/lib/moderacion/queries";
import type { NavBadge } from "@/lib/nav";

export type NavBadges = Partial<Record<NavBadge, number>>;

/**
 * Numbers shown next to sidebar sections (posts to review, new reports, content counts) and the lime dot on
 * Moderación. Each area contributes its own keys; missing keys render no badge. Keep every source cheap: it renders
 * on every page.
 */
export function useNavBadges(): NavBadges {
  return { ...useModerationBadges() };
}

/* Moderación: posts + comments waiting for review, and new inbox items (GET /moderation/counts, polled). */
function useModerationBadges(): NavBadges {
  const { data } = useModerationCounts();
  if (!data) return {};
  return { review: data.postsToReview + data.commentsToReview, inbox: data.inboxNew };
}
