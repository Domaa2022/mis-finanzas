import type { Metadata } from "next";
import { ResetForm } from "@/components/auth/ResetForm";

export const metadata: Metadata = { title: "Contraseña nueva" };

/** Llega aquí desde el enlace de recuperación, ya con sesión (lo exige el proxy). */
export default function ResetPasswordPage() {
  return <ResetForm />;
}
