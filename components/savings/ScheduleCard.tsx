"use client";

import { CalendarClock, Trash2 } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { Switch } from "@/components/ui/Switch";
import { deleteSchedule, setScheduleActive } from "@/lib/actions/savings";
import { shortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { scheduleHeadline } from "@/lib/savings/schedule";
import type { ScheduleItem } from "@/lib/data/savings";

/** Ahorro programado con interruptor de pausa. */
export function ScheduleCard({ schedule }: { schedule: ScheduleItem }) {
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useOptimistic(schedule.active);
  const head = scheduleHeadline(
    schedule.mode,
    schedule.frequency,
    formatMoney(schedule.amount_cents ?? 0, schedule.destination.currency),
    schedule.percent,
  );
  const title = `${head.figure} ${head.rest}`;

  return (
    <article className="flex items-center gap-3 rounded-[14px] border border-line bg-white p-3.5 lg:p-4">
      <span className="flex size-10 flex-none items-center justify-center rounded-[10px] bg-ink text-white">
        <CalendarClock aria-hidden size={20} strokeWidth={1.75} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-semibold">
          <span className="font-mono font-medium">{head.figure}</span> {head.rest}
        </span>
        <span className="truncate text-[13px] text-ink-3">
          A {schedule.destination.name} · desde {schedule.account.name}
        </span>
        <span className="text-[13px] text-ink-3">{active ? `Próximo: ${shortDate(schedule.next_run_on)}` : "En pausa"}</span>
      </div>
      <button
        type="button"
        aria-label={`Eliminar ahorro programado: ${title}`}
        disabled={pending}
        onClick={() => {
          if (!window.confirm("¿Eliminar este ahorro programado? Los aportes hechos se conservan.")) return;
          startTransition(async () => {
            const r = await deleteSchedule(schedule.id);
            if (!r.ok) window.alert(r.error);
          });
        }}
        className="flex size-10 flex-none cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
      >
        <Trash2 aria-hidden size={18} strokeWidth={1.75} />
      </button>
      <Switch
        checked={active}
        disabled={pending}
        aria-label={`Ahorro programado a ${schedule.destination.name} activo`}
        onCheckedChange={(next) =>
          startTransition(async () => {
            setActive(next);
            const r = await setScheduleActive(schedule.id, next);
            if (!r.ok) window.alert(r.error);
          })
        }
      />
    </article>
  );
}
