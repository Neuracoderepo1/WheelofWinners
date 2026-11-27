-- Defense-in-depth uniqueness for ledger effects.
-- A verified event can fund at most one earn entry, and a redemption can
-- produce at most one debit entry, even if a future service path is faulty.

begin;

create unique index points_ledger_one_earn_per_event_idx
  on public.points_ledger(source_event_id)
  where entry_type = 'earn' and source_event_id is not null;

create unique index points_ledger_one_debit_per_redemption_idx
  on public.points_ledger(redemption_id)
  where entry_type = 'redeem' and redemption_id is not null;

commit;
