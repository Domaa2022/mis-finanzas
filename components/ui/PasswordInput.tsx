"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { controlClasses, useFieldControl } from "./Field";

/** Campo de contraseña con botón para mostrarla u ocultarla. */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  const { invalid, ...a11y } = useFieldControl(props);

  return (
    <div className="relative">
      <input
        {...props}
        {...a11y}
        type={visible ? "text" : "password"}
        className={controlClasses(invalid, cn("pr-[52px]", className))}
      />
      <button
        type="button"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        onClick={() => setVisible((v) => !v)}
        className="absolute top-1/2 right-0.5 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-ink-3 hover:text-ink"
      >
        {visible ? (
          <EyeOff aria-hidden size={20} strokeWidth={1.75} />
        ) : (
          <Eye aria-hidden size={20} strokeWidth={1.75} />
        )}
      </button>
    </div>
  );
}
