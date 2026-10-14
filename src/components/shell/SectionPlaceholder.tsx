import type { ReactNode } from "react";
import { Panel } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { section as findSection, type AreaId } from "@/lib/nav";
import { FilterBar } from "./FilterBar";

/*
 * Temporary body for sections that are not implemented yet: the real header (title and hint from lib/nav.ts), the
 * Tracking filters when they apply and an empty state. Replace the whole page when the section is built.
 */
export function SectionPlaceholder({
  area,
  section,
  title,
  sub,
  filters = area === "tracking",
  back,
}: {
  area: AreaId;
  section: string;
  title?: ReactNode;
  sub?: ReactNode;
  filters?: boolean;
  back?: { label: string; href: string };
}) {
  const item = findSection(area, section);
  return (
    <>
      <PageHeader title={title ?? item.label} sub={sub ?? item.hint} back={back} />
      {filters && <FilterBar />}
      <Panel>
        <EmptyState
          icon={<item.icon size={22} />}
          title="Esta sección está en construcción"
          text="Pronto vas a ver acá los datos reales del servidor."
        />
      </Panel>
    </>
  );
}
