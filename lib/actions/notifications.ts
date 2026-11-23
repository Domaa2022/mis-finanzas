"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/data/core";
import { dbErrorMessage, fail, type ActionResult } from "./result";

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const { supabase } = await db();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: undefined };
}

export async function clearNotifications(): Promise<ActionResult> {
  const { supabase, user } = await db();
  const { error } = await supabase.from("notifications").delete().eq("user_id", user.id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return { ok: true, data: undefined };
}
