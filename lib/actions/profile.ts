"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/data/core";
import { TIMEZONES } from "@/lib/timezones";
import { dbErrorMessage, fail, INVALID_FORM, type ActionResult } from "./result";

const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Escribe tu nombre").max(60),
  timezone: z.enum(TIMEZONES.map((t) => t.value) as [string, ...string[]]),
});

export async function updateProfile(input: z.infer<typeof profileSchema>): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_FORM);
  const { supabase, user } = await db();
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, display_name: parsed.data.displayName, timezone: parsed.data.timezone });
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: undefined };
}

const subscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://"),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

export async function savePushSubscription(input: unknown): Promise<ActionResult> {
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return fail(INVALID_FORM);
  const { supabase, user } = await db();
  // Si el endpoint ya existía (por ejemplo, de otra sesión en este navegador), se reemplaza.
  await supabase.from("push_subscriptions").delete().eq("endpoint", parsed.data.endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: user.id,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
  });
  if (error) return fail(dbErrorMessage(error));
  return { ok: true, data: undefined };
}

export async function deletePushSubscription(endpoint: string): Promise<ActionResult> {
  if (!z.url().safeParse(endpoint).success) return fail(INVALID_FORM);
  const { supabase } = await db();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) return fail(dbErrorMessage(error));
  return { ok: true, data: undefined };
}
