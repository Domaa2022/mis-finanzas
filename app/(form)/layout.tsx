import { AppShell } from "@/components/layout/AppShell";

/** Formularios: a pantalla completa en móvil (sin barra inferior), con menú lateral en web. */
export default function FormLayout({ children }: LayoutProps<"/">) {
  return <AppShell withBottomNav={false}>{children}</AppShell>;
}
