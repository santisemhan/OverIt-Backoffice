"use client";

import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/icons";
import { describeError } from "@/lib/api";
import { cx } from "@/lib/cx";
import { dayShort } from "@/lib/format";
import { lookOf, ts } from "@/lib/tracking/labels";
import type { SubscriptionBucket, UserStatus } from "@/lib/tracking/types";

/* Pieces shared by the Tracking screens: user cell, status badges, "not measured" and error states. */

export const displayName = (u: { name: string | null; id: string }) => u.name?.trim() || "Sin nombre";

export function UserCell({
  u,
  sub,
}: {
  u: { id: string; name: string | null; email: string | null };
  sub?: ReactNode;
}) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar look={lookOf(u.id)} size={34} muted={!u.name} />
      <span className="min-w-0">
        <span className={cx("block truncate text-[14px] font-bold", u.name ? "text-ink" : "text-ink-70")}>
          {displayName(u)}
        </span>
        <span className="block truncate text-[12.5px] font-medium text-ink-60">{sub ?? u.email ?? "Sin email"}</span>
      </span>
    </span>
  );
}

export function SubBadge({
  bucket,
  expiresAt,
  grant,
  size = "md",
}: {
  bucket: SubscriptionBucket;
  expiresAt: string | null;
  grant?: boolean;
  size?: "sm" | "md";
}) {
  const d = expiresAt ? dayShort(ts(expiresAt)) : null;
  switch (bucket) {
    case "renews":
      return (
        <Badge size={size} tone="ok" icon={<Icon.rewind size={12} strokeWidth={2.4} className="-scale-x-100" />}>
          {d ? `Renueva el ${d}` : "Renueva"}
        </Badge>
      );
    case "canceledWithAccess":
      return (
        <Badge size={size} tone="warn">
          {d ? `Canceló · acceso hasta ${d}` : "Canceló, con acceso"}
        </Badge>
      );
    case "canceled":
      return <Badge size={size}>{d ? `Canceló · venció el ${d}` : "Canceló"}</Badge>;
    case "expired":
      return <Badge size={size}>{d ? `Vencida el ${d}` : "Vencida"}</Badge>;
    default:
      return grant ? (
        <Badge size={size} tone="info" icon={<Icon.star size={12} />}>
          Acceso de cortesía
        </Badge>
      ) : (
        <Badge size={size}>Sin suscripción</Badge>
      );
  }
}

export function OnbBadge({ status, size = "md" }: { status: UserStatus; size?: "sm" | "md" }) {
  if (status === "ACTIVE")
    return (
      <Badge size={size} tone="ok" icon={<Icon.check size={12} strokeWidth={2.6} />}>
        Completó
      </Badge>
    );
  if (status === "PENDING_SECOND_ONBOARDING")
    return (
      <Badge size={size} tone="info">
        Le falta la segunda parte
      </Badge>
    );
  return (
    <Badge size={size} tone="bad">
      Sin completar
    </Badge>
  );
}

/** For what the backend does not record (country, language, per-screen funnel, payments…). */
export function NotMeasured({ title = "Todavía no medimos esto", text }: { title?: string; text: ReactNode }) {
  return <EmptyState compact icon={<Icon.clock size={22} />} title={title} text={text} />;
}

export function ErrorPanel({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Panel>
      <EmptyState
        icon={<Icon.alert size={22} />}
        title="No pudimos cargar los datos"
        text={describeError(error)}
        action={onRetry && <Button onClick={onRetry}>Reintentar</Button>}
      />
    </Panel>
  );
}
