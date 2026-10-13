"use client";

import type { NavBadge } from "@/lib/nav";

/**
 * Numbers shown next to sidebar sections (posts to review, new reports, content counts) and the lime dot on
 * Moderación. Hook point: back it with react-query once the endpoints exist (keep it cheap, it renders on every
 * page). Missing keys render no badge.
 */
export function useNavBadges(): Partial<Record<NavBadge, number>> {
  return {};
}
