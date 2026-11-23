import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UiShowcase } from "./UiShowcase";

export const metadata: Metadata = { title: "Componentes" };

/** Catálogo de componentes base. Solo existe en desarrollo. */
export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <UiShowcase />;
}
