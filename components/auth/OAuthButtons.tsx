"use client";

import { useTransition } from "react";
import { signInWithProvider } from "@/lib/auth/actions";
import type { OAuthProvider } from "@/lib/auth/schemas";
import { FacebookLogo, GoogleLogo } from "./BrandLogos";

const PROVIDERS: { id: OAuthProvider; label: string; Logo: typeof GoogleLogo }[] = [
  { id: "google", label: "Google", Logo: GoogleLogo },
  { id: "facebook", label: "Facebook", Logo: FacebookLogo },
];

/** Separador "o continúa con" y botones de Google y Facebook. */
export function OAuthButtons({
  next,
  verb = "Iniciar sesión",
  onError,
}: {
  next?: string;
  verb?: string;
  onError: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <>
      <div className="flex items-center gap-3 text-[13px] text-muted">
        <span aria-hidden className="h-px flex-1 bg-line" />o continúa con
        <span aria-hidden className="h-px flex-1 bg-line" />
      </div>
      <div className="flex justify-center gap-4">
        {PROVIDERS.map(({ id, label, Logo }) => (
          <button
            key={id}
            type="button"
            aria-label={`${verb} con ${label}`}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await signInWithProvider(id, next);
                if (result && !result.ok) onError(result.error);
              })
            }
            className="flex h-[52px] w-16 cursor-pointer items-center justify-center rounded-xl border border-line-strong bg-white hover:bg-surface disabled:cursor-wait disabled:opacity-60"
          >
            <Logo size={26} />
          </button>
        ))}
      </div>
    </>
  );
}
