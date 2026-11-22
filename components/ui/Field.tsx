"use client";

import { CircleAlert } from "lucide-react";
import { createContext, use, useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type FieldContextValue = { id: string; describedBy?: string; invalid: boolean };

const FieldContext = createContext<FieldContextValue | null>(null);

/**
 * Devuelve id, aria-invalid y aria-describedby para el control dentro de un <Field>.
 * Las props explícitas tienen prioridad.
 */
export function useFieldControl(props: {
  id?: string;
  "aria-invalid"?: ComponentProps<"input">["aria-invalid"];
  "aria-describedby"?: string;
}) {
  const field = use(FieldContext);
  const ariaInvalid = props["aria-invalid"] ?? (field?.invalid ? true : undefined);
  return {
    id: props.id ?? field?.id,
    "aria-invalid": ariaInvalid,
    "aria-describedby": [field?.describedBy, props["aria-describedby"]].filter(Boolean).join(" ") || undefined,
    invalid: ariaInvalid === true || ariaInvalid === "true",
  };
}

type FieldProps = {
  label: ReactNode;
  /** Texto de ayuda debajo del campo. Se oculta mientras haya error. */
  hint?: ReactNode;
  /** Mensaje de error en ámbar. Marca el control como inválido. */
  error?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** Etiqueta + control + ayuda o error, conectados con id y aria-describedby. */
export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-msg`;
  const message = error ?? hint;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <FieldContext value={{ id, invalid: Boolean(error), describedBy: message ? messageId : undefined }}>
        {children}
      </FieldContext>
      {error ? (
        <p id={messageId} className="flex items-center gap-1.5 text-[13px] text-warn">
          <CircleAlert aria-hidden size={14} strokeWidth={2.25} className="flex-none" />
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-[13px] leading-snug text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Clases compartidas por Input, Select y MoneyInput. */
export function controlClasses(invalid: boolean, className?: string) {
  return cn(
    "h-[50px] w-full rounded-lg bg-white px-3.5 text-base text-ink placeholder:text-muted",
    "disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted",
    invalid ? "border-2 border-warn px-[13px]" : "border border-line-strong",
    className,
  );
}

/** Campo de texto. Dentro de <Field> recibe id y estado de error automáticamente. */
export function Input({ className, ...props }: ComponentProps<"input">) {
  const { invalid, ...a11y } = useFieldControl(props);
  return <input {...props} {...a11y} className={controlClasses(invalid, className)} />;
}
