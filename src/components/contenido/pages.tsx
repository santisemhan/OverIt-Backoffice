"use client";

import { breathingsConfig, factsConfig, phrasesConfig, resourcesConfig } from "./collections";
import { ContentCollectionPage } from "./ContentCollectionPage";

/* Client entry points for the collection routes (configs carry functions, so they cannot cross from a server page). */
export const BreathingsPage = () => <ContentCollectionPage config={breathingsConfig} />;
export const ResourcesPage = () => <ContentCollectionPage config={resourcesConfig} />;
export const PhrasesPage = () => <ContentCollectionPage config={phrasesConfig} />;
export const FactsPage = () => <ContentCollectionPage config={factsConfig} />;
