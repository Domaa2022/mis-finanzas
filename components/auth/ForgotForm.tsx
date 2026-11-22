"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { requestPasswordReset } from "@/lib/auth/actions";
import { forgotSchema, type ForgotInput } from "@/lib/auth/schemas";
import { AuthCard } from "./AuthCard";

export function ForgotForm() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState } = useForm<ForgotInput>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      setError(null);
      const result = await requestPasswordReset(values);
      if (!result.ok) setError(result.error);
      else setSent(result.message ?? null);
    }),
  );

  return (
    <AuthCard
      title="Recupera tu contraseña"
      subtitle="Te enviaremos un enlace para crear una nueva."
      footer={
        <Link href="/login" className="font-semibold">
          Volver a iniciar sesión
        </Link>
      }
    >
      {sent ? (
        <Alert tone="info" title="Revisa tu correo">
          {sent}
        </Alert>
      ) : (
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4 lg:gap-5">
          {error && <Alert title="No pudimos enviar el enlace">{error}</Alert>}
          <Field label="Correo electrónico" error={formState.errors.email?.message}>
            <Input type="email" autoComplete="email" placeholder="tu@correo.com" {...register("email")} />
          </Field>
          <Button type="submit" block disabled={pending} aria-busy={pending}>
            {pending ? "Enviando…" : "Enviar enlace"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
