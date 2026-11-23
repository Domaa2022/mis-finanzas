import type { Metadata } from "next";
import { Suspense } from "react";
import { GoalForm } from "@/components/savings/GoalForm";
import { FormSkeleton } from "@/components/skeletons/Skeletons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { getProfile } from "@/lib/data/core";

export const metadata: Metadata = { title: "Nueva meta" };

export default function NewGoalPage() {
  return (
    <>
      <PageHeader
        title="Nueva meta"
        subtitle="Ponle nombre y cifra a lo que quieres lograr."
        back={{ href: "/ahorros", label: "Ahorros", close: true }}
      />
      <Suspense
        fallback={
          <Sheet>
            <FormSkeleton fields={4} />
          </Sheet>
        }
      >
        <NewGoal />
      </Suspense>
    </>
  );
}

async function NewGoal() {
  const { today } = await getProfile();
  return <GoalForm today={today} />;
}
