import "server-only";
import type { NotificationRow } from "@/lib/supabase/database.types";
import { db } from "./core";

export async function getNotifications(limit = 50): Promise<NotificationRow[]> {
  const { supabase } = await db();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getUnreadCount(): Promise<number> {
  const { supabase } = await db();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  return count ?? 0;
}
