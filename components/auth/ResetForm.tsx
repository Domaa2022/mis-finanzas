"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { updatePassword } from "@/lib/auth/actions";
import { resetSchema, type ResetInput } from "@/lib/auth/schemas";
import { AuthCard } from "./AuthCard";

export function ResetForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState } = useForm<ResetInput>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      setError(null);
      const result = await updatePassword(values);
      if (result && !result.ok) setError(result.error);
    }),
  );

  return (
    <AuthCard title="Crea una contraseña nueva" subtitle="Úsala la próxima vez que inicies sesión.">
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4 lg:gap-5">
        {error && <Alert title="No pudimos guardar la contraseña">{error}</Alert>}
        <Field label="Contraseña nueva" hint="Al menos 8 caracteres." error={formState.errors.password?.message}>
          <PasswordInput autoComplete="new-password" {...register("password")} />
        </Field>
        <Field label="Repite la contraseña" error={formState.errors.confirm?.message}>
          <PasswordInput autoComplete="new-password" {...register("confirm")} />
        </Field>
        <Button type="submit" block disabled={pending} aria-busy={pending}>
          {pending ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
    </AuthCard>
  );
}
