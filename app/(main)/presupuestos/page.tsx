import type { Metadata } from "next";
import { ReportsScreen } from "@/components/reports/ReportsScreen";

export const metadata: Metadata = { title: "Presupuestos" };

export default function BudgetsPage({ searchParams }: PageProps<"/presupuestos">) {
  return <ReportsScreen view="presupuestos" searchParams={searchParams} />;
}
