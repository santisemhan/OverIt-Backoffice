"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
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

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full press items-center justify-between gap-4 rounded-[12px] text-left"
    >
      <span>
        <span className="block text-[14px] font-bold text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-[12.5px] font-medium text-ink-60">{hint}</span>}
      </span>
      <span
        className={cx(
          "relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-purple" : "bg-[#D9D5CD]",
        )}
      >
        <span
          className={cx(
            "absolute top-[3px] h-[20px] w-[20px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform duration-200 ease-[var(--ease-out)]",
            checked ? "translate-x-[21px]" : "translate-x-[3px]",
          )}
        />
      </span>
    </button>
  );
}

/* Número con − y + (en lugar de las flechitas del sistema). Se puede escribir; al salir se ajusta al rango */
export function Stepper({
  value,
  onChange,
  min,
  max,
  label,
  suffix,
  hideLabel = true,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  label: string;
  suffix?: string;
  hideLabel?: boolean;
  className?: string;
}) {
  const id = useId();
  const [text, setText] = useState(String(value));
  // Re-sync the text when the value changes from outside (adjusting state during render, not in an effect).
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setText(String(value));
  }
  const set = (v: number) => onChange(Math.max(min, Math.min(max, Math.round(v))));
  const commit = () => {
    const v = parseInt(text, 10);
    if (Number.isFinite(v)) set(v);
    else setText(String(value));
  };
  const btnCls =
    "press flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[9px] text-ink-70 hover:bg-purple-10 hover:text-purple disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <div className={className}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "mb-1.5 block text-[13px] font-bold text-ink-70"}>
        {label}
      </label>
      <div className="flex h-[40px] items-center gap-0.5 rounded-[12px] bg-white px-1 shadow-[inset_0_0_0_1px_#E3E0D9] focus-within:shadow-[inset_0_0_0_2px_#5E5BE2]">
        <button
          type="button"
          aria-label={`Restar 1 a ${label}`}
          className={btnCls}
          disabled={value <= min}
          onClick={() => set(value - 1)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
            <path d="M5 12h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </button>
        <span className="flex min-w-0 flex-1 items-baseline justify-center gap-0.5">
          <input
            id={id}
            inputMode="numeric"
            value={text}
            onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") {
                e.preventDefault();
                set(value + 1);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                set(value - 1);
              } else if (e.key === "Enter") commit();
            }}
            className="w-[2.6ch] bg-transparent text-center text-[15px] font-black text-ink tnum focus-visible:outline-none"
          />
          {suffix && <span className="text-[12.5px] font-bold text-ink-60">{suffix}</span>}
        </span>
        <button
          type="button"
          aria-label={`Sumar 1 a ${label}`}
          className={btnCls}
          disabled={value >= max}
          onClick={() => set(value + 1)}
        >
          <Icon.plus size={15} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}
