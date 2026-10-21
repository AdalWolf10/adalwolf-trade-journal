"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

export default function FilterDisclosure({ children, count, label }: { children: ReactNode; count: number; label: string }) {
  const [open, setOpen] = useState(false);
  return <section className={`filter-disclosure ${open ? "is-open" : ""}`} aria-label={label}>
    <button type="button" className="filter-disclosure-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
      <SlidersHorizontal size={15} aria-hidden="true" />
      <span>Filters</span>
      {count ? <span className="filter-count">{count} active</span> : null}
      <ChevronDown size={15} className="disclosure-chevron" aria-hidden="true" />
    </button>
    <div hidden={!open}>{children}</div>
  </section>;
}
