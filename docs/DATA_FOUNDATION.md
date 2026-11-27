# PostgreSQL Data Foundation

This migration establishes the first relational model for WheelofWinners as a deterministic loyalty service. It is a schema baseline, not a complete backend or production deployment.

## Live database status

The schema baseline and foreign-key index completion have been applied to the explicitly selected Supabase project AD2EARN promotional games (project reference mbnpbihlawrnjkwduvjo).

Recorded live migration history:
- 20261127090012 wheelofwinners_initial_loyalty_foundation
- 20261127090025 wheelofwinners_foreign_key_indexes
- 20261127091705 wheelofwinners_supabase_auth_identity

The repository migration files are maintained as the reviewable source counterpart. The second migration adds ten foreign-key indexes verified against the live catalog. No secrets or credentials belong in this repository.

## Migration files

- 001_initial_loyalty_foundation.sql: core tables, constraints, append-only ledger trigger, and deny-by-default RLS.
- 002_foreign_key_indexes.sql: ten indexes for foreign-key lookup paths.
- 003_supabase_auth_identity.sql: links `profiles.id` to `auth.users(id)` with `ON DELETE CASCADE` and creates a minimal profile row from a server-side Auth insert trigger.

The migrations target PostgreSQL 15+. The Auth identity migration is applied and catalog-verified: the profile foreign key and Auth user trigger both exist. The project currently has zero Auth users and zero profile rows, so no user data was backfilled.

## Security properties and current limitations

- Row-level security is enabled on all 12 application tables. No permissive client policies are created. Direct client access remains denied until reviewed policies or server-only access paths are deliberately added.
- Supabase Security Advisor currently reports 12 informational rls_enabled_no_policy findings. This is expected from the deliberate deny-by-default posture, but it is not a completed authorization design.
- A verified engagement event must be recorded only after a trusted server adapter validates provider authenticity, event freshness, campaign mapping, and replay protection.
- Provider event IDs and redemption idempotency keys are unique.
- Points are represented as ledger deltas. Corrections use compensating entries, never edits or deletes. The trigger is a database guard, not protection against privileged operators who can alter schema or disable triggers.
- Reward prices are fixed integer point costs. Inventory distinguishes reserved and fulfilled stock.
- No cash balance, transfer, cash-out, paid entry, spin, draw, or random reward allocation is represented.
- Health Advisor currently reports no findings. Performance Advisor reports unused indexes on the newly created, not-yet-workloaded tables; do not remove indexes solely on that basis.

## Not implemented

This schema does not yet implement the transactional earning/redemption service, membership authorization policies, provider signature adapters, campaign cap enforcement, vendor state-transition authorization, inventory reservation RPC, or reconciliation jobs. No production users, campaigns, points, rewards, or redemptions have been seeded. Do not treat this foundation as production-ready.

## Required database tests before real activity

1. Anonymous and ordinary client roles cannot read or write protected tables without an explicit policy.
2. Duplicate provider event IDs cannot create duplicate verified events.
3. Ledger UPDATE and DELETE fail.
4. Duplicate user/idempotency-key pairs cannot create duplicate grants or redemptions.
5. Concurrent redemption attempts cannot overspend points or reserve stock twice.
6. Vendor members cannot access another vendor's rewards or redemptions.
7. Advertiser members cannot access consumer-level event histories.
8. Suspended accounts cannot earn or redeem.
9. Cancellation, rejection, fulfilment, and dispute transitions preserve inventory and ledger invariants.
10. Provider replay, stale-event, invalid-signature, campaign-window, per-user-cap, and total-cap cases are rejected server-side.