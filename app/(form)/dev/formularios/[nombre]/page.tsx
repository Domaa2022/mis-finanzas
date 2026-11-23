import { notFound } from "next/navigation";
import { DemoForm } from "./DemoForm";
import { DEMO_FORMS } from "./forms";
import { PageHeader } from "@/components/ui/PageHeader";

/** Vista previa de los formularios con datos de ejemplo. Solo en desarrollo. */
export const instant = false;

export function generateStaticParams() {
  return Object.keys(DEMO_FORMS).map((nombre) => ({ nombre }));
}

export default async function DevFormPage({ params }: PageProps<"/dev/formularios/[nombre]">) {
  if (process.env.NODE_ENV === "production") notFound();
  const { nombre } = await params;
  const form = DEMO_FORMS[nombre as keyof typeof DEMO_FORMS];
  if (!form) notFound();
  return (
    <>
      <PageHeader title={form.title} subtitle={form.subtitle} back={{ href: "/dev/ui", label: "Componentes", close: true }} />
      <DemoForm nombre={nombre as keyof typeof DEMO_FORMS} />
    </>
  );
}
