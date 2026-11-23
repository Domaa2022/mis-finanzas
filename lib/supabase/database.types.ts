/**
 * Tipos de la base de datos, con el mismo formato que `supabase gen types typescript`.
 * Se mantienen a mano junto con supabase/migrations/. Si instalas la CLI, puedes
 * regenerarlos con: npx supabase gen types typescript --project-id <id> > lib/supabase/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = { created_at: string };

export type AccountType = "savings" | "checking" | "credit_card" | "cash";
export type CurrencyCode = "HNL" | "USD";
export type CategoryKind = "expense" | "income";
export type TransactionKind = "expense" | "income" | "transfer_out" | "transfer_in" | "goal_contribution";
export type Frequency = "weekly" | "biweekly" | "monthly";
export type ScheduleMode = "fixed" | "percent";
export type ScheduleEnds = "on_goal" | "on_date" | "never";
export type RecurringKind = "subscription" | "fixed";
export type RecurringFrequency = "weekly" | "monthly" | "yearly";
export type PendingStatus = "pending" | "confirmed" | "dismissed";

type Rel<Name extends string, Columns extends string[], Target extends string> = {
  foreignKeyName: Name;
  columns: Columns;
  isOneToOne: false;
  referencedRelation: Target;
  referencedColumns: string[];
};

type Table<
  Row,
  Required extends keyof Row,
  Relationships extends unknown[] = [],
  Optional extends keyof Row = Exclude<keyof Row, Required>,
> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Pick<Row, Optional>>;
  Update: Partial<Row>;
  Relationships: Relationships;
};

export type ProfileRow = {
  id: string;
  display_name: string | null;
  timezone: string;
} & Timestamps;

export type AccountRow = {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  bank_name: string | null;
  currency: CurrencyCode;
  color: string;
  include_in_total: boolean;
  initial_balance_cents: number;
  archived_at: string | null;
} & Timestamps;

export type CategoryRow = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  kind: CategoryKind;
} & Timestamps;

export type TransactionRow = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  kind: TransactionKind;
  amount_cents: number;
  occurred_on: string;
  note: string | null;
  transfer_id: string | null;
  recurring_id: string | null;
  goal_id: string | null;
} & Timestamps;

export type TransferRow = {
  id: string;
  user_id: string;
  from_account_id: string;
  to_account_id: string;
  amount_cents: number;
  to_amount_cents: number;
  exchange_rate: number | null;
  occurred_on: string;
  note: string | null;
} & Timestamps;

export type SavingsGoalRow = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  target_cents: number;
  target_date: string | null;
  currency: CurrencyCode;
  archived_at: string | null;
} & Timestamps;

export type SavingsScheduleRow = {
  id: string;
  user_id: string;
  goal_id: string;
  account_id: string;
  mode: ScheduleMode;
  amount_cents: number | null;
  percent: number | null;
  frequency: Frequency;
  days: number[];
  ends: ScheduleEnds;
  end_date: string | null;
  active: boolean;
  next_run_on: string;
  last_run_on: string;
} & Timestamps;

export type RecurringChargeRow = {
  id: string;
  user_id: string;
  kind: RecurringKind;
  name: string;
  icon: string;
  color: string;
  account_id: string;
  category_id: string | null;
  amount_cents: number;
  is_variable: boolean;
  frequency: RecurringFrequency;
  day_rule: number;
  next_charge_on: string;
  remind_days_before: number | null;
  auto_register: boolean;
  active: boolean;
} & Timestamps;

export type PendingChargeRow = {
  id: string;
  user_id: string;
  recurring_id: string;
  due_on: string;
  amount_cents: number;
  status: PendingStatus;
  transaction_id: string | null;
} & Timestamps;

export type BudgetRow = {
  id: string;
  user_id: string;
  category_id: string;
  month: string;
  limit_cents: number;
} & Timestamps;

export type NotificationRow = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
} & Timestamps;

export type AccountBalanceRow = {
  account_id: string;
  user_id: string;
  currency: CurrencyCode;
  balance_cents: number;
};

export type GoalProgressRow = {
  goal_id: string;
  user_id: string;
  saved_cents: number;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "id">;
      accounts: Table<AccountRow, "name" | "type" | "color">;
      categories: Table<CategoryRow, "name" | "color" | "kind">;
      transactions: Table<
        TransactionRow,
        "account_id" | "kind" | "amount_cents",
        [
          Rel<"transactions_account_id_user_id_fkey", ["account_id", "user_id"], "accounts">,
          Rel<"transactions_category_id_user_id_fkey", ["category_id", "user_id"], "categories">,
          Rel<"transactions_transfer_id_fkey", ["transfer_id"], "transfers">,
          Rel<"transactions_goal_id_fkey", ["goal_id"], "savings_goals">,
          Rel<"transactions_recurring_id_fkey", ["recurring_id"], "recurring_charges">,
        ]
      >;
      transfers: Table<
        TransferRow,
        "from_account_id" | "to_account_id" | "amount_cents" | "to_amount_cents",
        [
          Rel<"transfers_from_account_id_user_id_fkey", ["from_account_id", "user_id"], "accounts">,
          Rel<"transfers_to_account_id_user_id_fkey", ["to_account_id", "user_id"], "accounts">,
        ]
      >;
      savings_goals: Table<SavingsGoalRow, "name" | "color" | "target_cents">;
      savings_schedules: Table<
        SavingsScheduleRow,
        "goal_id" | "account_id" | "mode" | "frequency" | "days",
        [
          Rel<"savings_schedules_goal_id_user_id_fkey", ["goal_id", "user_id"], "savings_goals">,
          Rel<"savings_schedules_account_id_user_id_fkey", ["account_id", "user_id"], "accounts">,
        ]
      >;
      recurring_charges: Table<
        RecurringChargeRow,
        "name" | "color" | "account_id" | "amount_cents" | "frequency" | "day_rule" | "next_charge_on",
        [
          Rel<"recurring_charges_account_id_user_id_fkey", ["account_id", "user_id"], "accounts">,
          Rel<"recurring_charges_category_id_user_id_fkey", ["category_id", "user_id"], "categories">,
        ]
      >;
      pending_charges: Table<
        PendingChargeRow,
        "recurring_id" | "due_on" | "amount_cents",
        [Rel<"pending_charges_recurring_id_user_id_fkey", ["recurring_id", "user_id"], "recurring_charges">]
      >;
      budgets: Table<
        BudgetRow,
        "category_id" | "month" | "limit_cents",
        [Rel<"budgets_category_id_user_id_fkey", ["category_id", "user_id"], "categories">]
      >;
      notifications: Table<NotificationRow, "kind" | "title" | "body">;
    };
    Views: {
      account_balances: { Row: AccountBalanceRow; Relationships: [] };
      goal_progress: { Row: GoalProgressRow; Relationships: [] };
    };
    Functions: {
      user_today: { Args: { p_user?: string }; Returns: string };
      create_transfer: {
        Args: {
          p_from_account: string;
          p_to_account: string;
          p_amount_cents: number;
          p_exchange_rate?: number | null;
          p_occurred_on?: string | null;
          p_note?: string | null;
        };
        Returns: string;
      };
      contribute_to_goal: {
        Args: { p_goal: string; p_account: string; p_amount_cents: number; p_occurred_on?: string | null };
        Returns: string;
      };
      confirm_pending_charge: {
        Args: { p_pending: string; p_amount_cents?: number | null; p_occurred_on?: string | null };
        Returns: string;
      };
    };
    Enums: {
      account_type: AccountType;
      currency_code: CurrencyCode;
      category_kind: CategoryKind;
      transaction_kind: TransactionKind;
    };
    CompositeTypes: Record<string, never>;
  };
};
