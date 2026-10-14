"use client";

import { useContentBadges } from "@/components/content/useContentBadges";
import { useModerationCounts } from "@/lib/moderation/queries";
import type { NavBadge } from "@/lib/nav";

export type NavBadges = Partial<Record<NavBadge, number>>;

/**
 * Numbers shown next to sidebar sections (posts to review, new reports, content counts) and the lime dot on
 * Moderation. Each area contributes its own keys; missing keys render no badge. Keep every source cheap: it renders
 * on every page.
 */
export function useNavBadges(): NavBadges {
  return { ...useModerationBadges(), ...useContentBadges() };
}

/* Moderation: posts + comments waiting for review, and new inbox items (GET /moderation/counts, polled). */
function useModerationBadges(): NavBadges {
  const { data } = useModerationCounts();
  if (!data) return {};
  return { review: data.postsToReview + data.commentsToReview, inbox: data.inboxNew };
}
