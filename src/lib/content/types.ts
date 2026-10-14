/* Content: shapes of /api/backoffice/content/* (docs/API.md §6). */

export type ContentStatus = "Published" | "Draft";
export type ContentLanguage = "es" | "en";
export type ContentKind = "challenges" | "breathings" | "resources" | "phrases" | "facts";

export interface ContentCommon {
  id: string;
  language: string;
  status: ContentStatus;
  sortOrder: number;
  updatedAt: string | null;
}

export type TextVariant = "Default" | "Highlighted";
export interface TextPart {
  text: string;
  variant: TextVariant;
}

export type ChallengeType = "InApp" | "External";
export interface InputDefinition {
  key: string;
  label: string;
}
export interface Challenge extends ContentCommon {
  title: string;
  action: string;
  type: ChallengeType;
  inputDefinitions: InputDefinition[] | null;
  /** Position among published (1-based); null for drafts. */
  day: number | null;
  activeUsersToday: number;
}
export interface ChallengeInput {
  title: string;
  action: string;
  type: ChallengeType;
  inputDefinitions?: { key?: string; label: string }[];
  language?: string;
  status?: ContentStatus;
  /** Create only: 0-based index to insert at. */
  position?: number;
}

export type BreathingType = "Relax" | "Sleep" | "Crisis";
export type BreathAction = "Inhale" | "Hold" | "Exhale";
export interface BreathStep {
  action: BreathAction;
  durationInSeconds: number;
}
export interface Breathing extends ContentCommon {
  title: string;
  description: string;
  type: BreathingType;
  cicle: BreathStep[];
}
export interface BreathingInput {
  title: string;
  description: string;
  type: BreathingType;
  cicle: BreathStep[];
  language?: string;
  status?: ContentStatus;
  position?: number;
}

export type ResourceCategory = "Duel" | "Anxiety" | "SelfEsteem" | "Bonds" | "Science" | "NewHorizons";
export type ResourceType = "Article" | "Tip";
export interface Resource extends ContentCommon {
  titleParts: TextPart[];
  description: string;
  content: string;
  category: ResourceCategory;
  type: ResourceType;
  reads: number;
}
export interface ResourceInput {
  titleParts: TextPart[];
  description: string;
  content: string;
  category: ResourceCategory;
  type: ResourceType;
  language?: string;
  status?: ContentStatus;
  position?: number;
}

export interface Phrase extends ContentCommon {
  parts: TextPart[];
  author: string | null;
  favorites: number;
}
export interface PhraseInput {
  parts: TextPart[];
  author: string | null;
  language?: string;
  status?: ContentStatus;
  position?: number;
}

export interface ScientificFact extends ContentCommon {
  text: string;
}
export interface ScientificFactInput {
  text: string;
  language?: string;
  status?: ContentStatus;
  position?: number;
}

export interface ContentItemMap {
  challenges: Challenge;
  breathings: Breathing;
  resources: Resource;
  phrases: Phrase;
  facts: ScientificFact;
}
export interface ContentInputMap {
  challenges: ChallengeInput;
  breathings: BreathingInput;
  resources: ResourceInput;
  phrases: PhraseInput;
  facts: ScientificFactInput;
}
export type AnyContent = ContentItemMap[ContentKind];

/** API path segment per collection. */
export const CONTENT_PATH: Record<ContentKind, string> = {
  challenges: "challenges",
  breathings: "breathings",
  resources: "resources",
  phrases: "phrases",
  facts: "scientific-facts",
};

export const LANGUAGES: { id: ContentLanguage; label: string }[] = [
  { id: "es", label: "Español" },
  { id: "en", label: "Inglés" },
];

/** The challenge path lasts 90 days, shown in stretches of 15 (the app's milestones). */
export const PATH_DAYS = 90;
export const STRETCH = 15;

export const BREATHING_TYPES: { id: BreathingType; label: string }[] = [
  { id: "Crisis", label: "Para crisis" },
  { id: "Relax", label: "Para relajarte" },
  { id: "Sleep", label: "Para dormir" },
];
export const BREATH_ACTIONS: { id: BreathAction; label: string }[] = [
  { id: "Inhale", label: "Inhala" },
  { id: "Hold", label: "Sostén" },
  { id: "Exhale", label: "Exhala" },
];
export const CATEGORIES: { id: ResourceCategory; label: string; bg: string; ink: string }[] = [
  { id: "Duel", label: "Duelo", bg: "#E6E5FA", ink: "#5E5BE2" },
  { id: "Anxiety", label: "Ansiedad", bg: "#FEE9E0", ink: "#C9572B" },
  { id: "SelfEsteem", label: "Autoestima", bg: "#F2FFB0", ink: "#5E5BE2" },
  { id: "Bonds", label: "Vínculos", bg: "#DFF2D8", ink: "#3E7C35" },
  { id: "Science", label: "Ciencia", bg: "#E3F2FB", ink: "#22628F" },
  { id: "NewHorizons", label: "Nuevos horizontes", bg: "#FBD4D4", ink: "#D23E3E" },
];
export const categoryOf = (id: ResourceCategory) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];

/** Joined text of a list of parts (the app splits parts by word and joins them with spaces). */
export const partsText = (parts: TextPart[]) =>
  parts
    .map((p) => p.text.trim())
    .filter(Boolean)
    .join(" ");
