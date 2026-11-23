"use client";

import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { updateProfile } from "@/lib/actions/profile";
import { TIMEZONES } from "@/lib/timezones";

export function ProfileForm({ displayName, timezone }: { displayName: string; timezone: string }) {
  const [name, setName] = useState(displayName);
  const [tz, setTz] = useState(timezone);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return setStatus({ ok: false, text: "Escribe tu nombre." });
        startTransition(async () => {
          const r = await updateProfile({ displayName: name, timezone: tz });
          setStatus(r.ok ? { ok: true, text: "Cambios guardados." } : { ok: false, text: r.error });
        });
      }}
    >
      {status && !status.ok && <Alert title="No pudimos guardar">{status.text}</Alert>}
      <Field label="Tu nombre">
        <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
      </Field>
      <Field label="Zona horaria" hint="Define el día de hoy, el fin de mes y cuándo se hacen tus aportes y cobros.">
        <Select value={tz} onChange={(e) => setTz(e.target.value)} options={TIMEZONES} />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" size="md" disabled={pending} aria-busy={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
        {status?.ok && (
          <span role="status" className="text-sm text-ink-3">
            {status.text}
          </span>
        )}
      </div>
    </form>
  );
}
