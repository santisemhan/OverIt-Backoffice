"use client";

import type { ComponentType, ReactNode } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { Field, Stepper, TextArea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/icons";
import { Select } from "@/components/ui/Select";
import { Segmented } from "@/components/ui/Tabs";
import { cx } from "@/lib/cx";
import { n, plural } from "@/lib/format";
import {
  BREATH_ACTIONS,
  BREATHING_TYPES,
  CATEGORIES,
  categoryOf,
  partsText,
  type BreathStep,
  type BreathingType,
  type ContentInputMap,
  type ContentItemMap,
  type ContentKind,
  type ContentStatus,
  type ResourceCategory,
  type ResourceType,
  type TextPart,
} from "@/lib/contenido/types";
import { BLOCK_TYPES, parseBody, readingMinutes, serializeBody, type Block, type BlockType } from "./body";
import { BreathPreview, breathingTypeLabel, FactPreview, PhrasePreview, ResourcePreview, rhythmPath } from "./previews";
import { FieldError, PartsEditor } from "./shared";

/*
 * One config per collection (everything but challenges, which has its own page): how an API item becomes an editable
 * draft and back, validation (mirrors the API rules in docs/API.md §6), the form, the preview and how a row looks.
 */

export type CollectionKind = Exclude<ContentKind, "challenges">;
export type Err = (key: string) => string | null;
export interface FormProps<D> {
  d: D;
  set: (p: Partial<D>) => void;
  err: Err;
}

export interface Collection<K extends CollectionKind, D extends { status: ContentStatus }> {
  kind: K;
  label: string;
  sub: string;
  nuevo: string;
  /** "esta respiración", "este artículo"… */
  this: string;
  count: (k: number) => string;
  icon: ReactNode;
  empty: () => D;
  fromItem: (x: ContentItemMap[K]) => D;
  toInput: (d: D) => ContentInputMap[K];
  validate: (d: D) => Record<string, string | null>;
  Form: ComponentType<FormProps<D>>;
  Preview: ComponentType<{ d: D }>;
  title: (x: ContentItemMap[K]) => string;
  meta: (x: ContentItemMap[K]) => ReactNode;
  search: (x: ContentItemMap[K]) => string;
  Thumb: ComponentType<{ item: ContentItemMap[K] }>;
}

const thumbBox = "flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[12px]";
const max = (v: string, m: number, label: string) => (v.length > m ? `${label}: máximo ${n(m)} caracteres.` : null);
const partsError = (parts: TextPart[]) =>
  !parts.some((p) => p.text.trim())
    ? "Escribí el texto."
    : parts.some((p) => !p.text.trim())
      ? "Hay partes vacías: completalas o quitalas."
      : null;

/* ═══════════════ Respiraciones ═══════════════ */

type BreathDraft = {
  title: string;
  description: string;
  type: BreathingType;
  cicle: BreathStep[];
  status: ContentStatus;
};

function BreathForm({ d, set, err }: FormProps<BreathDraft>) {
  const setStep = (i: number, p: Partial<BreathStep>) =>
    set({ cicle: d.cicle.map((s, k) => (k === i ? { ...s, ...p } : s)) });
  return (
    <>
      <Field
        label="Título"
        value={d.title}
        onChange={(e) => set({ title: e.target.value })}
        error={err("title")}
        counter={{ n: d.title.length, max: 200 }}
        placeholder="Ej.: Freno de ansiedad"
      />
      <TextArea
        label="Descripción"
        rows={3}
        value={d.description}
        onChange={(e) => set({ description: e.target.value })}
        error={err("description")}
        counter={{ n: d.description.length, max: 2000 }}
        placeholder="Para qué sirve y cómo se hace, en una o dos líneas."
      />
      <Select<BreathingType>
        label="Grupo"
        hideLabel={false}
        value={d.type}
        onChange={(type) => set({ type })}
        options={BREATHING_TYPES.map((g) => ({ id: g.id, label: g.label }))}
        className="w-[220px]"
      />
      <div>
        <p className="text-[13px] font-bold text-ink-70">Ritmo</p>
        <p className="mt-0.5 mb-2 text-[12.5px] leading-[1.45] font-medium text-ink-60">
          Un paso por lado de la forma: 2 pasos es un círculo, 3 un triángulo y 4 un cuadrado.
        </p>
        <ol className="space-y-2">
          {d.cicle.map((s, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-5 text-right text-[12.5px] font-bold text-ink-60 tnum">{i + 1}</span>
              <Select<BreathStep["action"]>
                label={`Paso ${i + 1}`}
                value={s.action}
                onChange={(action) => setStep(i, { action })}
                options={BREATH_ACTIONS.map((k) => ({ id: k.id, label: k.label }))}
                className="min-w-0 flex-1"
              />
              <Stepper
                label={`Segundos del paso ${i + 1}`}
                value={s.durationInSeconds}
                onChange={(v) => setStep(i, { durationInSeconds: v })}
                min={1}
                max={600}
                suffix="s"
                className="w-[128px]"
              />
              <IconButton
                label={`Quitar paso ${i + 1}`}
                tone="danger"
                disabled={d.cicle.length <= 1}
                onClick={() => set({ cicle: d.cicle.filter((_, k) => k !== i) })}
              >
                <Icon.x size={16} />
              </IconButton>
            </li>
          ))}
        </ol>
        {d.cicle.length < 8 && (
          <Button
            size="sm"
            variant="ghost"
            className="mt-2"
            icon={<Icon.plus size={15} />}
            onClick={() => set({ cicle: [...d.cicle, { action: "Hold", durationInSeconds: 4 }] })}
          >
            Sumar paso
          </Button>
        )}
        <FieldError text={err("cicle")} />
      </div>
    </>
  );
}

export const breathingsConfig: Collection<"breathings", BreathDraft> = {
  kind: "breathings",
  label: "Respiraciones",
  sub: "Las respiraciones guiadas de Recursos. Los borradores no se ven en la app.",
  nuevo: "Nueva respiración",
  this: "esta respiración",
  count: (k) => plural(k, "respiración", "respiraciones"),
  icon: <Icon.wind size={22} />,
  empty: () => ({
    title: "",
    description: "",
    type: "Relax",
    cicle: [
      { action: "Inhale", durationInSeconds: 4 },
      { action: "Hold", durationInSeconds: 4 },
      { action: "Exhale", durationInSeconds: 6 },
    ],
    status: "Draft",
  }),
  fromItem: (x) => ({
    title: x.title,
    description: x.description,
    type: x.type,
    cicle: x.cicle.map((s) => ({ ...s })),
    status: x.status,
  }),
  toInput: (d) => ({
    title: d.title.trim(),
    description: d.description.trim(),
    type: d.type,
    cicle: d.cicle,
    status: d.status,
  }),
  validate: (d) => ({
    title: !d.title.trim() ? "Ponele un título." : max(d.title, 200, "Título"),
    description: !d.description.trim() ? "Escribí una descripción corta." : max(d.description, 2000, "Descripción"),
    cicle: !d.cicle.length
      ? "Tiene que tener al menos un paso."
      : d.cicle.some((s) => !(s.durationInSeconds >= 1 && s.durationInSeconds <= 600))
        ? "Cada paso dura entre 1 y 600 segundos."
        : null,
  }),
  Form: BreathForm,
  Preview: ({ d }) => <BreathPreview {...d} />,
  title: (x) => x.title,
  meta: (x) => `${breathingTypeLabel(x.type)} · ritmo ${x.cicle.map((s) => s.durationInSeconds).join(" · ")} s`,
  search: (x) => `${x.title} ${x.description}`,
  Thumb: ({ item }) => (
    <span className={cx(thumbBox, "bg-mint")}>
      <svg width="30" height="30" viewBox="0 0 60 60" aria-hidden>
        <path
          d={rhythmPath(item.cicle.length, 60)}
          fill="none"
          stroke="#3E7C35"
          strokeWidth={4}
          strokeLinejoin="round"
        />
      </svg>
    </span>
  ),
};

/* ═══════════════ Artículos & Tips ═══════════════ */

type ResourceDraft = {
  titleParts: TextPart[];
  description: string;
  category: ResourceCategory;
  type: ResourceType;
  blocks: Block[];
  status: ContentStatus;
};

function ResourceForm({ d, set, err }: FormProps<ResourceDraft>) {
  const setBlock = (i: number, b: Block) => set({ blocks: d.blocks.map((x, k) => (k === i ? b : x)) });
  const moveBlock = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= d.blocks.length) return;
    const next = [...d.blocks];
    [next[i], next[j]] = [next[j], next[i]];
    set({ blocks: next });
  };
  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="mb-1.5 text-[13px] font-bold text-ink-70">Tipo</p>
          <Segmented<ResourceType>
            label="Tipo"
            value={d.type}
            onChange={(type) => set({ type })}
            options={[
              { id: "Article", label: "Artículo" },
              { id: "Tip", label: "Tip" },
            ]}
          />
        </div>
        <Select<ResourceCategory>
          label="Categoría"
          hideLabel={false}
          value={d.category}
          onChange={(category) => set({ category })}
          options={CATEGORIES.map((c) => ({ id: c.id, label: c.label }))}
          className="w-[210px]"
        />
      </div>
      <PartsEditor
        label="Título"
        hint="Partilo en partes y marcá cuáles van resaltadas en lima, como en la app (“El horizonte” + “es tuyo”)."
        parts={d.titleParts}
        onChange={(titleParts) => set({ titleParts })}
        error={err("titleParts")}
      />
      <TextArea
        label="Resumen para la tarjeta"
        rows={2}
        value={d.description}
        onChange={(e) => set({ description: e.target.value })}
        error={err("description")}
        counter={{ n: d.description.length, max: 2000 }}
      />
      <div>
        <p className="mb-1.5 text-[13px] font-bold text-ink-70">Cuerpo</p>
        <ol className="space-y-2.5">
          {d.blocks.map((b, i) => (
            <li key={i} className="rounded-[14px] bg-white p-3 shadow-[inset_0_0_0_1px_#EAE7E0]">
              <div className="flex items-center gap-1.5">
                <Select<BlockType>
                  label={`Tipo de bloque ${i + 1}`}
                  value={b.t}
                  onChange={(t) => setBlock(i, { t, text: b.text, lead: t === "li" ? (b.lead ?? "") : undefined })}
                  options={BLOCK_TYPES.map((k) => ({ id: k.id, label: k.label }))}
                  className="w-[190px]"
                />
                <span className="flex-1" />
                <IconButton label={`Subir bloque ${i + 1}`} onClick={() => moveBlock(i, -1)} disabled={i === 0}>
                  <Icon.up size={16} />
                </IconButton>
                <IconButton
                  label={`Bajar bloque ${i + 1}`}
                  onClick={() => moveBlock(i, 1)}
                  disabled={i === d.blocks.length - 1}
                >
                  <Icon.down size={16} />
                </IconButton>
                <IconButton
                  label={`Borrar bloque ${i + 1}`}
                  tone="danger"
                  disabled={d.blocks.length <= 1}
                  onClick={() => set({ blocks: d.blocks.filter((_, k) => k !== i) })}
                >
                  <Icon.trash size={16} />
                </IconButton>
              </div>
              {b.t === "li" && (
                <Field
                  className="mt-2"
                  label="Inicio en negrita"
                  value={b.lead ?? ""}
                  onChange={(e) => setBlock(i, { ...b, lead: e.target.value })}
                  placeholder="Ej.: Probá esto:"
                />
              )}
              <TextArea
                className="mt-2"
                label="Texto"
                rows={b.t === "p" ? 4 : 2}
                value={b.text}
                onChange={(e) => setBlock(i, { ...b, text: e.target.value })}
                hint={b.t === "p" ? "Para negrita, escribí **así**." : undefined}
              />
            </li>
          ))}
        </ol>
        <Button
          size="sm"
          variant="ghost"
          className="mt-2"
          icon={<Icon.plus size={15} />}
          onClick={() => set({ blocks: [...d.blocks, { t: "p", text: "" }] })}
        >
          Sumar bloque
        </Button>
        <FieldError text={err("blocks")} />
      </div>
    </>
  );
}

export const resourcesConfig: Collection<"resources", ResourceDraft> = {
  kind: "resources",
  label: "Artículos & Tips",
  sub: "Lo que se lee en Recursos. Los borradores no se ven en la app.",
  nuevo: "Nuevo artículo o tip",
  this: "este artículo",
  count: (k) => plural(k, "artículo o tip", "artículos y tips"),
  icon: <Icon.book size={22} />,
  empty: () => ({
    titleParts: [
      { text: "", variant: "Default" },
      { text: "", variant: "Highlighted" },
    ],
    description: "",
    category: "Duel",
    type: "Article",
    blocks: [{ t: "p", text: "" }],
    status: "Draft",
  }),
  fromItem: (x) => ({
    titleParts: x.titleParts.length ? x.titleParts.map((p) => ({ ...p })) : [{ text: "", variant: "Default" }],
    description: x.description,
    category: x.category,
    type: x.type,
    blocks: parseBody(x.content),
    status: x.status,
  }),
  toInput: (d) => ({
    titleParts: d.titleParts.map((p) => ({ ...p, text: p.text.trim() })),
    description: d.description.trim(),
    content: serializeBody(d.blocks),
    category: d.category,
    type: d.type,
    status: d.status,
  }),
  validate: (d) => ({
    titleParts: partsError(d.titleParts),
    description: !d.description.trim() ? "Escribí una línea para la tarjeta." : max(d.description, 2000, "Resumen"),
    blocks: !d.blocks.some((b) => b.text.trim())
      ? "Escribí al menos un párrafo."
      : d.blocks.some((b) => !b.text.trim() && !b.lead?.trim())
        ? "Hay bloques vacíos: completalos o borralos."
        : null,
  }),
  Form: ResourceForm,
  Preview: ({ d }) => <ResourcePreview {...d} minutes={readingMinutes(serializeBody(d.blocks))} />,
  title: (x) => partsText(x.titleParts) || "Sin título",
  meta: (x) =>
    `${x.type === "Tip" ? "Tip" : "Artículo"} · ${categoryOf(x.category).label} · ${readingMinutes(x.content)} min · leído ${x.reads === 1 ? "1 vez" : `${n(x.reads)} veces`}`,
  search: (x) => `${partsText(x.titleParts)} ${x.description}`,
  Thumb: ({ item }) => {
    const c = categoryOf(item.category);
    return (
      <span className={thumbBox} style={{ background: c.bg, color: c.ink }}>
        {item.type === "Tip" ? <Icon.bulb size={22} /> : <Icon.book size={22} />}
      </span>
    );
  },
};

/* ═══════════════ Frases ═══════════════ */

type PhraseDraft = { parts: TextPart[]; author: string; status: ContentStatus };

function PhraseForm({ d, set, err }: FormProps<PhraseDraft>) {
  return (
    <>
      <PartsEditor
        label="Frase"
        hint="Partila en partes y marcá cuáles van resaltadas en lima."
        parts={d.parts}
        onChange={(parts) => set({ parts })}
        error={err("parts")}
      />
      <Field
        label="Autor (opcional)"
        value={d.author}
        onChange={(e) => set({ author: e.target.value })}
        error={err("author")}
        counter={{ n: d.author.length, max: 200 }}
      />
    </>
  );
}

export const phrasesConfig: Collection<"phrases", PhraseDraft> = {
  kind: "phrases",
  label: "Frases",
  sub: "Las frases de Recursos. La app muestra una publicada al azar por día; el orden es solo para esta lista.",
  nuevo: "Nueva frase",
  this: "esta frase",
  count: (k) => plural(k, "frase", "frases"),
  icon: <Icon.quote size={22} />,
  empty: () => ({
    parts: [
      { text: "", variant: "Default" },
      { text: "", variant: "Highlighted" },
    ],
    author: "",
    status: "Draft",
  }),
  fromItem: (x) => ({
    parts: x.parts.length ? x.parts.map((p) => ({ ...p })) : [{ text: "", variant: "Default" }],
    author: x.author ?? "",
    status: x.status,
  }),
  toInput: (d) => ({
    parts: d.parts.map((p) => ({ ...p, text: p.text.trim() })),
    author: d.author.trim() || null,
    status: d.status,
  }),
  validate: (d) => ({ parts: partsError(d.parts), author: max(d.author, 200, "Autor") }),
  Form: PhraseForm,
  Preview: ({ d }) => <PhrasePreview parts={d.parts} author={d.author} />,
  title: (x) => partsText(x.parts) || "Sin texto",
  meta: (x) => `${x.author ? `${x.author} · ` : ""}${x.favorites === 1 ? "1 favorito" : `${n(x.favorites)} favoritos`}`,
  search: (x) => `${partsText(x.parts)} ${x.author ?? ""}`,
  Thumb: () => (
    <span className={cx(thumbBox, "bg-purple text-lime")}>
      <Icon.quote size={20} />
    </span>
  ),
};

/* ═══════════════ Datos científicos ═══════════════ */

type FactDraft = { text: string; status: ContentStatus };

function FactForm({ d, set, err }: FormProps<FactDraft>) {
  return (
    <TextArea
      label="Dato"
      rows={4}
      value={d.text}
      onChange={(e) => set({ text: e.target.value })}
      error={err("text")}
      counter={{ n: d.text.length, max: 2000 }}
      placeholder="Una frase corta, clara y verificable."
    />
  );
}

export const factsConfig: Collection<"facts", FactDraft> = {
  kind: "facts",
  label: "Datos científicos",
  sub: "El “Dato científico del día” de la home. La app muestra uno publicado al azar por día.",
  nuevo: "Nuevo dato",
  this: "este dato",
  count: (k) => plural(k, "dato", "datos"),
  icon: <Icon.brain size={22} />,
  empty: () => ({ text: "", status: "Draft" }),
  fromItem: (x) => ({ text: x.text, status: x.status }),
  toInput: (d) => ({ text: d.text.trim(), status: d.status }),
  validate: (d) => ({ text: !d.text.trim() ? "Escribí el dato." : max(d.text, 2000, "Dato") }),
  Form: FactForm,
  Preview: ({ d }) => <FactPreview text={d.text} />,
  title: (x) => x.text,
  meta: () => null,
  search: (x) => x.text,
  Thumb: () => (
    <span className={cx(thumbBox, "bg-purple-10 text-purple")}>
      <Icon.brain size={22} />
    </span>
  ),
};
