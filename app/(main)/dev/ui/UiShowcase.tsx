"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { AccountTile } from "@/components/ui/AccountTile";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Money } from "@/components/ui/Money";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { Switch } from "@/components/ui/Switch";
import { ACCOUNT_COLORS } from "@/lib/accounts/meta";
import { DEMO_ACCOUNTS } from "@/lib/demo";
import { CURRENCY_NAME, formatMoney, type Currency } from "@/lib/money";

const CURRENCY_OPTIONS = [
  { value: "HNL", label: "Lempiras", prefix: "L" },
  { value: "USD", label: "Dólares", prefix: "$" },
] as const;

const FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quincenal" },
  { value: "monthly", label: "Mensual" },
] as const;

const BANK_OPTIONS = [
  { value: "a", label: "[Banco A]" },
  { value: "b", label: "[Banco B]" },
  { value: "none", label: "Ninguno (efectivo)" },
];

export function UiShowcase({ charts }: { charts?: ReactNode }) {
  return (
    <>
      <PageHeader eyebrow="Fase 0" title="Componentes" figure={<Money cents={123450} currency="HNL" />}>
        <div className="flex max-w-md flex-col gap-2">
          <ProgressBar variant="on-primary" value={62} label="Ejemplo sobre la franja roja" />
          <div className="flex justify-between text-[13px] text-on-primary-muted">
            <span>Usado 62 %</span>
            <span>Quedan 8 días</span>
          </div>
        </div>
      </PageHeader>

      <Sheet>
        <p className="max-w-2xl text-sm leading-normal text-ink-3">
          Catálogo de los componentes base. Esta ruta solo existe en desarrollo. La franja roja de arriba es{" "}
          <code className="font-mono text-[13px]">PageHeader</code> y esta hoja blanca es{" "}
          <code className="font-mono text-[13px]">Sheet</code>.
        </p>

        <div className="grid gap-x-12 gap-y-10 lg:grid-cols-2">
          <ButtonsDemo />
          <MoneyDemo />
          <FieldsDemo />
          <ControlsDemo />
          <ProgressDemo />
          <FormDemo />
        </div>

        <AccountTilesDemo />
        {charts}
      </Sheet>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="border-b border-line pb-2 font-mono text-xs tracking-[0.08em] text-muted uppercase">{title}</h2>
      {children}
    </section>
  );
}

function ButtonsDemo() {
  return (
    <Section title="Button">
      <Button block>Guardar cuenta</Button>
      <div className="flex flex-wrap gap-3">
        <Button size="md">Principal</Button>
        <Button size="md" variant="secondary">
          Secundario
        </Button>
        <Button size="md" variant="ghost">
          Fantasma
        </Button>
        <Button size="md" disabled>
          Deshabilitado
        </Button>
        <ButtonLink size="md" variant="secondary" href="/">
          Enlace
        </ButtonLink>
      </div>
    </Section>
  );
}

function MoneyDemo() {
  return (
    <Section title="Money">
      <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
        <dt className="text-ink-3">Lempiras</dt>
        <dd>
          <Money cents={123450} currency="HNL" />
        </dd>
        <dt className="text-ink-3">Dólares</dt>
        <dd>
          <Money cents={123450} currency="USD" />
        </dd>
        <dt className="text-ink-3">Cero</dt>
        <dd>
          <Money cents={0} currency="HNL" />
        </dd>
        <dt className="text-ink-3">Negativo (tarjeta)</dt>
        <dd>
          <Money cents={-318975} currency="HNL" />
        </dd>
        <dt className="text-ink-3">Ingreso con signo</dt>
        <dd>
          <Money cents={2500000} currency="HNL" signDisplay="always" className="text-teal" />
        </dd>
        <dt className="text-ink-3">Grande</dt>
        <dd>
          <Money cents={123456789} currency="HNL" className="text-2xl" />
        </dd>
      </dl>
    </Section>
  );
}

function FieldsDemo() {
  const [bank, setBank] = useState("");
  return (
    <Section title="Field · Input · Select">
      <Field label="Nombre de la cuenta">
        <Input placeholder="Ej. Ahorro para el viaje" />
      </Field>
      <Field label="Correo electrónico" hint="Te enviaremos un enlace para entrar.">
        <Input type="email" placeholder="tu@correo.com" autoComplete="email" />
      </Field>
      <Field label="Contraseña" error="Contraseña incorrecta">
        <Input type="password" defaultValue="contrasena" />
      </Field>
      <Field label="Banco">
        <Select
          placeholder="Selecciona tu banco"
          options={BANK_OPTIONS}
          value={bank}
          onChange={(e) => setBank(e.target.value)}
        />
      </Field>
    </Section>
  );
}

function ControlsDemo() {
  const [currency, setCurrency] = useState<Currency>("HNL");
  const [frequency, setFrequency] = useState<(typeof FREQUENCY_OPTIONS)[number]["value"]>("biweekly");
  const [active, setActive] = useState(true);
  const [paused, setPaused] = useState(false);
  const [cents, setCents] = useState<number | null>(null);
  const [big, setBig] = useState<number | null>(25000);

  return (
    <Section title="SegmentedControl · Switch · MoneyInput">
      <SegmentedControl legend="Moneda" options={CURRENCY_OPTIONS} value={currency} onChange={setCurrency} />
      <SegmentedControl legend="Frecuencia" options={FREQUENCY_OPTIONS} value={frequency} onChange={setFrequency} />
      <Field
        label="Saldo actual"
        hint={
          cents === null
            ? "Lo que tienes hoy en esta cuenta. Puedes ajustarlo después."
            : `Se guarda como ${cents} centavos (${formatMoney(cents, currency)}).`
        }
      >
        <MoneyInput currency={currency} value={cents} onValueChange={setCents} />
      </Field>
      <Field label="Monto del gasto">
        <MoneyInput currency={currency} value={big} onValueChange={setBig} size="lg" />
      </Field>
      <div className="flex flex-col">
        <Switch label="Ahorro programado activo" checked={active} onCheckedChange={setActive} />
        <Switch label="Pausar recordatorios" checked={paused} onCheckedChange={setPaused} />
        <Switch label="Deshabilitado" checked={false} onCheckedChange={() => {}} disabled />
      </div>
    </Section>
  );
}

function ProgressDemo() {
  const rows = [
    { name: "Comida", used: 45, color: ACCOUNT_COLORS[0].value, status: "Vas bien" },
    { name: "Transporte", used: 86, color: ACCOUNT_COLORS[1].value, status: "Cerca del límite" },
    { name: "Entretenimiento", used: 120, color: ACCOUNT_COLORS[2].value, status: "Te pasaste del límite" },
  ];
  return (
    <Section title="ProgressBar">
      {rows.map((row) => {
        const warn = row.used >= 80;
        const over = row.used > 100;
        return (
          <div key={row.name} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="text-[15px] font-semibold">{row.name}</span>
              <span className={warn ? "text-[13px] text-warn" : "text-[13px] text-ink-3"}>{row.status}</span>
            </div>
            <div className="flex items-center gap-3">
              <ProgressBar
                className="flex-1"
                value={row.used}
                label={`Presupuesto de ${row.name}`}
                color={over ? "var(--color-warn-bar)" : row.color}
              />
              <span className="w-11 text-right font-mono text-xs text-ink-3">{row.used} %</span>
            </div>
          </div>
        );
      })}
      <p className="text-[13px] text-muted">
        Los umbrales (80 % y 100 %) son de la regla 9; aquí solo se ilustran. La lógica real llega en la Fase 6.
      </p>
    </Section>
  );
}

const demoSchema = z.object({
  name: z.string().trim().min(1, "Escribe un nombre"),
  currency: z.enum(["HNL", "USD"]),
  amount: z.number({ error: "Escribe un monto válido" }).int().positive("El monto debe ser mayor que cero"),
});

type DemoForm = z.infer<typeof demoSchema>;

function FormDemo() {
  const [saved, setSaved] = useState<DemoForm | null>(null);
  const { register, control, handleSubmit, formState } = useForm<DemoForm>({
    resolver: zodResolver(demoSchema),
    defaultValues: { name: "", currency: "HNL", amount: undefined },
  });
  const currency = useWatch({ control, name: "currency" });

  return (
    <Section title="Formulario (React Hook Form + Zod)">
      <form noValidate className="flex flex-col gap-5" onSubmit={handleSubmit(setSaved)}>
        <Field label="Nombre" error={formState.errors.name?.message}>
          <Input {...register("name")} placeholder="Ej. Supermercado" />
        </Field>
        <Controller
          control={control}
          name="currency"
          render={({ field }) => (
            <SegmentedControl legend="Moneda" options={CURRENCY_OPTIONS} value={field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          control={control}
          name="amount"
          render={({ field, fieldState }) => (
            <Field label="Monto" error={fieldState.error?.message}>
              <MoneyInput
                ref={field.ref}
                name={field.name}
                currency={currency}
                value={field.value ?? null}
                onValueChange={(c) => field.onChange(c ?? undefined)}
                onBlur={field.onBlur}
              />
            </Field>
          )}
        />
        <Button type="submit" block>
          Probar validación
        </Button>
        {saved && (
          <p role="status" className="text-sm text-ink-3">
            Válido: {saved.name}, <Money cents={saved.amount} currency={saved.currency} /> ({CURRENCY_NAME[saved.currency]}).
          </p>
        )}
      </form>
    </Section>
  );
}

function AccountTilesDemo() {
  const [selected, setSelected] = useState("all");
  return (
    <Section title="AccountTile">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3">
        <AccountTile
          type="all"
          name="Todas"
          subtitle={`${DEMO_ACCOUNTS.length} cuentas`}
          balanceCents={0}
          currency="HNL"
          selected={selected === "all"}
          onSelect={() => setSelected("all")}
        />
        {DEMO_ACCOUNTS.map((a) => (
          <AccountTile
            key={a.id}
            type={a.type}
            name={a.name}
            subtitle={`${a.bank} · ${CURRENCY_NAME[a.currency]}`}
            balanceCents={a.balanceCents}
            currency={a.currency}
            color={a.color}
            selected={selected === a.id}
            onSelect={() => setSelected(a.id)}
          />
        ))}
      </div>
    </Section>
  );
}
