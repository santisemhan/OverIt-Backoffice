"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./icons";

/* ═══════════════ Campos ═══════════════ */

export function SearchField({
  value,
  onChange,
  placeholder,
  className,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
  label: string;
}) {
  return (
    <div className={cx("relative", className)}>
      <Icon.search size={17} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-60" />
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-[40px] w-full rounded-[12px] bg-white pr-9 pl-9 text-[14px] font-medium text-ink shadow-[inset_0_0_0_1px_#E3E0D9] placeholder:text-ink-60 hover:shadow-[inset_0_0_0_1px_#D6D2C9] focus-visible:shadow-[inset_0_0_0_2px_#5E5BE2] focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Borrar búsqueda"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-1.5 flex h-[28px] w-[28px] -translate-y-1/2 press items-center justify-center rounded-[8px] text-ink-60 hover:bg-ink/5 hover:text-ink"
        >
          <Icon.x size={15} />
        </button>
      )}
    </div>
  );
}

type FieldProps = {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  counter?: { n: number; max: number };
  /** El nombre solo para lectores de pantalla (cuando el contexto ya lo dice) */ hideLabel?: boolean;
};
export function Field({
  label,
  hint,
  error,
  counter,
  className,
  hideLabel,
  ...rest
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={cx("relative", className)}>
      {hideLabel ? (
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
      ) : (
        <FieldLabel id={id} label={label} counter={counter} />
      )}
      <input
        id={id}
        aria-invalid={!!error || undefined}
        aria-describedby={error || hint ? `${id}-help` : undefined}
        className={cx(
          "h-[42px] w-full rounded-[12px] bg-white px-3.5 text-[14.5px] font-medium text-ink placeholder:text-ink-60 focus-visible:outline-none",
          error
            ? "shadow-[inset_0_0_0_1.5px_#B42F2F]"
            : "shadow-[inset_0_0_0_1px_#E3E0D9] hover:shadow-[inset_0_0_0_1px_#D6D2C9] focus-visible:shadow-[inset_0_0_0_2px_#5E5BE2]",
        )}
        {...rest}
      />
      <Help id={`${id}-help`} hint={hint} error={error} />
    </div>
  );
}

export function TextArea({
  label,
  hint,
  error,
  counter,
  className,
  rows = 4,
  hideLabel,
  ...rest
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className={className}>
      {hideLabel ? (
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
      ) : (
        <FieldLabel id={id} label={label} counter={counter} />
      )}
      <textarea
        id={id}
        rows={rows}
        style={{ minHeight: Math.round(rows * 14.5 * 1.5 + 22) }}
        aria-invalid={!!error || undefined}
        aria-describedby={error || hint ? `${id}-help` : undefined}
        className={cx(
          /* Sin la manija del sistema: crece sola con el texto (y hace scroll pasado el máximo) */
          "block [field-sizing:content] max-h-[420px] w-full resize-none rounded-[12px] bg-white px-3.5 py-2.5 text-[14.5px] leading-[1.5] font-medium text-ink placeholder:text-ink-60 focus-visible:outline-none",
          error
            ? "shadow-[inset_0_0_0_1.5px_#B42F2F]"
            : "shadow-[inset_0_0_0_1px_#E3E0D9] hover:shadow-[inset_0_0_0_1px_#D6D2C9] focus-visible:shadow-[inset_0_0_0_2px_#5E5BE2]",
        )}
        {...rest}
      />
      <Help id={`${id}-help`} hint={hint} error={error} />
    </div>
  );
}

function FieldLabel({ id, label, counter }: { id: string; label: string; counter?: { n: number; max: number } }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <label htmlFor={id} className="text-[13px] font-bold text-ink-70">
        {label}
      </label>
      {counter && (
        <span
          className={cx("text-[12px] font-medium tnum", counter.n > counter.max ? "text-bad" : "text-ink-60")}
        >{`${counter.n}/${counter.max}`}</span>
      )}
    </div>
  );
}
function Help({ id, hint, error }: { id: string; hint?: ReactNode; error?: string | null }) {
  if (!error && !hint) return null;
  return (
    <p
      id={id}
      className={cx(
        "mt-1.5 flex items-start gap-1.5 text-[12.5px] leading-[1.4] font-medium",
        error ? "text-bad" : "text-ink-60",
      )}
    >
      {error && <Icon.alert size={14} className="mt-px shrink-0" />}
      {error || hint}
    </p>
  );
}
