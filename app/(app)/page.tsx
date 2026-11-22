import type { Metadata } from "next";
import { DemoHome } from "./DemoHome";

export const metadata: Metadata = { title: "Inicio" };

/** Fase 0: Inicio armado con los componentes base y datos de muestra. */
export default function HomePage() {
  return <DemoHome />;
}
