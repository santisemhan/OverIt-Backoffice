"use client";

import type { ReactNode } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Card";
import { SearchField, Toggle } from "@/components/ui/Field";
import { Icon } from "@/components/ui/icons";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Segmented } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { describeError } from "@/lib/api";
import { cx } from "@/lib/cx";
import { LANGUAGES, type ContentLanguage, type ContentStatus, type TextPart } from "@/lib/contenido/types";
import { useContentLanguage } from "./language";

export type StatusView = "all" | ContentStatus;

export const short = (t: string, max = 50) => (t.length > max ? `${t.slice(0, max - 1)}…` : t);

/** Search, status filter and language: the bar above every content list. */
export function ContentToolbar({
  q,
  onQ,
  view,
  onView,
  label,
  placeholder = "Buscar",
  right,
}: {
  q: string;
  onQ: (v: string) => void;
  view: StatusView;
  onView: (v: StatusView) => void;
  label: string;
  placeholder?: string;
  right?: ReactNode;
}) {
  const [lang, setLang] = useContentLanguage();
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <SearchField label={label} value={q} onChange={onQ} placeholder={placeholder} className="w-full sm:w-[280px]" />
      <Segmented
        label="Estado"
        size="sm"
        value={view}
        onChange={onView}
        options={[
          { id: "all", label: "Todos" },
          { id: "Published", label: "Publicados" },
          { id: "Draft", label: "Borradores" },
        ]}
      />
      <Select<ContentLanguage>
        label="Idioma"
        size="sm"
        value={lang}
        onChange={setLang}
        options={LANGUAGES.map((l) => ({ id: l.id, label: l.label, icon: <Icon.globe size={15} /> }))}
        className="w-[140px]"
      />
      {right && (
        <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-60 sm:ml-auto">{right}</div>
      )}
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Panel pad={false}>
      <ul className="divide-y divide-bo-line" aria-busy="true" aria-label="Cargando">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex items-center gap-4 px-5 py-3.5">
            <Skeleton className="h-[46px] w-[46px] rounded-[12px]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-[14px] w-[45%]" />
              <Skeleton className="h-[12px] w-[70%]" />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function ListError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <Panel>
      <EmptyState
        icon={<Icon.alert size={22} />}
        title="No pudimos cargar el contenido"
        text={describeError(error)}
        action={
          <Button icon={<Icon.undo size={15} />} onClick={onRetry}>
            Reintentar
          </Button>
        }
      />
    </Panel>
  );
}

/** Published / draft switch at the bottom of every editor. */
export function StatusToggle({
  status,
  onChange,
  hint,
}: {
  status: ContentStatus;
  onChange: (s: ContentStatus) => void;
  hint?: string;
}) {
  return (
    <div className="rounded-[14px] bg-white p-4 shadow-[inset_0_0_0_1px_#EAE7E0]">
      <Toggle
        checked={status === "Published"}
        onChange={(v) => onChange(v ? "Published" : "Draft")}
        label="Publicado"
        hint={hint ?? (status === "Published" ? "Se ve en la app." : "Borrador: no se ve en la app.")}
      />
    </div>
  );
}

export function FieldError({ text }: { text: string | null | undefined }) {
  return text ? <p className="mt-1.5 text-[12.5px] font-medium text-bad">{text}</p> : null;
}

/**
 * A text split in parts, some highlighted in lime (phrase parts and resource title parts). The app joins the parts
 * with spaces.
 */
export function PartsEditor({
  label,
  hint,
  parts,
  onChange,
  error,
}: {
  label: string;
  hint?: string;
  parts: TextPart[];
  onChange: (p: TextPart[]) => void;
  error?: string | null;
}) {
  const set = (i: number, p: Partial<TextPart>) => onChange(parts.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= parts.length) return;
    const next = [...parts];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div>
      <p className="text-[13px] font-bold text-ink-70">{label}</p>
      {hint && <p className="mt-0.5 mb-2 text-[12.5px] leading-[1.45] font-medium text-ink-60">{hint}</p>}
      <ol className="space-y-2">
        {parts.map((p, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <input
              aria-label={`Parte ${i + 1}`}
              value={p.text}
              onChange={(e) => set(i, { text: e.target.value })}
              placeholder={i === 0 ? "Ej.: Estoy aprendiendo a" : "Ej.: quererme mejor"}
              className={cx(
                "h-[42px] min-w-0 flex-1 rounded-[12px] px-3.5 text-[14.5px] font-medium text-ink shadow-[inset_0_0_0_1px_#E3E0D9] placeholder:text-ink-60 focus-visible:shadow-[inset_0_0_0_2px_#5E5BE2] focus-visible:outline-none",
                p.variant === "Highlighted" ? "bg-lime" : "bg-white",
              )}
            />
            <button
              type="button"
              aria-pressed={p.variant === "Highlighted"}
              onClick={() => set(i, { variant: p.variant === "Highlighted" ? "Default" : "Highlighted" })}
              className={cx(
                "h-[36px] shrink-0 press rounded-[10px] px-2.5 text-[12.5px] font-bold",
                p.variant === "Highlighted" ? "bg-ink text-lime" : "bg-ink/[0.05] text-ink-70 hover:bg-ink/10",
              )}
            >
              Resaltado
            </button>
            <IconButton label={`Subir parte ${i + 1}`} onClick={() => move(i, -1)} disabled={i === 0}>
              <Icon.up size={16} />
            </IconButton>
            <IconButton label={`Bajar parte ${i + 1}`} onClick={() => move(i, 1)} disabled={i === parts.length - 1}>
              <Icon.down size={16} />
            </IconButton>
            <IconButton
              label={`Quitar parte ${i + 1}`}
              tone="danger"
              disabled={parts.length <= 1}
              onClick={() => onChange(parts.filter((_, k) => k !== i))}
            >
              <Icon.x size={16} />
            </IconButton>
          </li>
        ))}
      </ol>
      <Button
        size="sm"
        variant="ghost"
        className="mt-2"
        icon={<Icon.plus size={15} />}
        onClick={() =>
          onChange([
            ...parts,
            { text: "", variant: parts.at(-1)?.variant === "Highlighted" ? "Default" : "Highlighted" },
          ])
        }
      >
        Sumar parte
      </Button>
      <FieldError text={error} />
    </div>
  );
}

/** Parts rendered like the app: highlighted ones in lime. */
export function PartsText({ parts, highlight = "text-lime" }: { parts: TextPart[]; highlight?: string }) {
  const shown = parts.filter((p) => p.text.trim());
  return (
    <>
      {shown.map((p, i) => (
        <span key={i} className={p.variant === "Highlighted" ? highlight : undefined}>
          {i > 0 ? " " : ""}
          {p.text.trim()}
        </span>
      ))}
    </>
  );
}
