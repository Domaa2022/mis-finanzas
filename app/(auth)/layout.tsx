import { Logo } from "@/components/layout/Logo";

/**
 * Estructura de login, registro y recuperación (diseños `Movil` y `Main`).
 * - Móvil: franja roja con el lema y hoja blanca con el formulario.
 * - Web: columna roja con la tarjeta del formulario y panel claro con la gráfica.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col bg-white lg:flex-row">
      <section className="on-primary flex flex-1 flex-col bg-primary text-white lg:flex-[1_1_480px] lg:justify-between lg:gap-12 lg:px-[clamp(24px,5vw,72px)] lg:py-10">
        <header className="flex flex-col gap-7 px-6 pt-14 pb-7 lg:p-0">
          <Logo variant="on-primary" />
          <p className="text-[26px] leading-[1.15] font-semibold tracking-[-0.025em] lg:hidden">
            Controla tus gastos.
            <br />
            <span className="text-on-primary-muted">Haz crecer tus ahorros.</span>
          </p>
        </header>

        <main className="flex flex-1 flex-col rounded-t-[28px] bg-white px-6 py-7 text-ink lg:w-full lg:max-w-[464px] lg:flex-none lg:self-center lg:rounded-[24px_24px_8px_8px] lg:px-8 lg:pt-9 lg:pb-8">
          {children}
        </main>

        <footer className="hidden text-[13px] text-on-primary-muted lg:block">© 2026 Mis Finanzas</footer>
      </section>

      <aside className="hidden min-w-0 flex-col justify-between gap-12 border-l border-[#E7E5E4] bg-surface p-[clamp(32px,5vw,72px)] lg:flex lg:flex-[999_1_560px]">
        <span className="font-mono text-xs tracking-[0.08em] text-muted">TU DINERO, EN UNA SOLA VISTA</span>
        <div className="flex flex-col gap-10">
          <h2 className="text-[clamp(40px,4.6vw,64px)] leading-[1.02] font-semibold tracking-[-0.035em] text-ink">
            Controla tus gastos.
            <br />
            <span className="text-primary">Haz crecer tus ahorros.</span>
          </h2>
          <figure className="m-0 flex flex-col gap-3.5">
            <div className="flex gap-5 text-[13px] text-ink-3">
              <span className="flex items-center gap-2">
                <span className="h-0.5 w-4 bg-primary" />
                Ahorro
              </span>
              <span className="flex items-center gap-2">
                <span className="w-4 border-t-2 border-dashed border-faint" />
                Gastos
              </span>
            </div>
            <svg viewBox="0 0 560 240" preserveAspectRatio="none" className="block h-60 w-full" aria-hidden="true">
              {[20, 85, 150].map((y) => (
                <line key={y} x1="0" y1={y} x2="560" y2={y} stroke="#E7E5E4" vectorEffect="non-scaling-stroke" />
              ))}
              <line x1="0" y1="215" x2="560" y2="215" stroke="#D6D3D1" vectorEffect="non-scaling-stroke" />
              <path
                d="M0,200 C70,196 110,186 170,170 S290,140 350,112 S470,62 560,36 L560,215 L0,215 Z"
                fill="var(--color-primary)"
                fillOpacity="0.06"
              />
              <path
                d="M0,110 L93,128 L186,98 L280,140 L373,122 L466,150 L560,138"
                fill="none"
                stroke="#A1A1AA"
                strokeWidth="2"
                strokeDasharray="5 5"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M0,200 C70,196 110,186 170,170 S290,140 350,112 S470,62 560,36"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <figcaption className="sr-only">Ilustración: el ahorro crece mientras los gastos se mantienen.</figcaption>
            <div aria-hidden className="flex justify-between font-mono text-xs text-muted">
              {["ENE", "FEB", "MAR", "ABR", "MAY", "JUN"].map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </figure>
        </div>
        <ul className="m-0 grid list-none grid-cols-3 gap-6 border-t border-[#E7E5E4] p-0 pt-6">
          {[
            "Registra cada gasto en segundos",
            "Metas de ahorro con seguimiento mensual",
            "Tus datos cifrados y solo tuyos",
          ].map((text, i) => (
            <li key={text} className="flex flex-col gap-1.5">
              <span className="font-mono text-xs text-primary">0{i + 1}</span>
              <span className="text-sm leading-[1.4] text-ink-2">{text}</span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
