# PostgreSQL Data Foundation

This migration establishes the first relational model for WheelofWinners as a deterministic loyalty service. It is a schema baseline, not a complete backend or production deployment.

## Live database status

The schema baseline, foreign-key indexes, identity mapping, transactional RPCs, and ledger uniqueness safeguards have been applied to the explicitly selected Supabase project AD2EARN promotional games (project reference mbnpbihlawrnjkwduvjo).

Recorded live migration history:
- 20261127090012 wheelofwinners_initial_loyalty_foundation
- 20261127090025 wheelofwinners_foreign_key_indexes
- 20261127091705 wheelofwinners_supabase_auth_identity
- 20261127091930 wheelofwinners_transactional_rewards
- 20261127092011 wheelofwinners_server_only_redemption_rpc
- 20261127092258 wheelofwinners_ledger_effect_uniqueness
- 20261127092401 wheelofwinners_consumer_read_apis
- 20261127092608 wheelofwinners_reject_future_engagement_events

The repository migration files are maintained as the reviewable source counterpart. The second migration adds ten foreign-key indexes verified against the live catalog. No secrets or credentials belong in this repository.

## Migration files

- 001_initial_loyalty_foundation.sql: core tables, constraints, append-only ledger trigger, and deny-by-default RLS.
- 002_foreign_key_indexes.sql: ten indexes for foreign-key lookup paths.
- 003_supabase_auth_identity.sql: links `profiles.id` to `auth.users(id)` with `ON DELETE CASCADE` and creates a minimal profile row from a server-side Auth insert trigger.
- 004_transactional_rewards.sql: adds an idempotent, cap-enforcing server-only engagement award function and an atomic fixed-price redemption function.
- 005_server_only_redemption_rpc.sql: tightens redemption execution to `service_role` only. The application server must verify the user's Auth session and derive the user ID before calling it; never accept a user ID from browser input.
- 006_ledger_effect_uniqueness.sql: adds partial unique indexes to ensure one earning ledger entry per verified event and one redemption debit per redemption.
- 007_consumer_read_apis.sql: adds server-role-only catalogue and points-balance functions.
- 008_reject_future_engagement_events.sql: adds a database-side rejection for future-dated provider events.

The migrations target PostgreSQL 15+. The Auth identity migration is applied and catalog-verified: the profile foreign key and Auth user trigger both exist. The project currently has zero Auth users and zero profile rows, so no user data was backfilled.

## Security properties and current limitations

- Row-level security is enabled on all 12 application tables. No permissive client policies are created. Direct client access remains denied until reviewed policies or server-only access paths are deliberately added.
- Supabase Security Advisor currently reports 12 informational rls_enabled_no_policy findings. This is expected from the deliberate deny-by-default posture, but it is not a completed authorization design.
- A verified engagement event must be recorded only after a trusted server adapter validates provider authenticity, event freshness, campaign mapping, and replay protection.
- Provider event IDs and redemption idempotency keys are unique. Partial unique indexes also prevent multiple earn entries for one verified event or multiple debit entries for one redemption.
- Points are represented as ledger deltas. Corrections use compensating entries, never edits or deletes. The trigger is a database guard, not protection against privileged operators who can alter schema or disable triggers.
- Reward prices are fixed integer point costs. Inventory distinguishes reserved and fulfilled stock.
- No cash balance, transfer, cash-out, paid entry, spin, draw, or random reward allocation is represented.
- Health Advisor currently reports no findings. Performance Advisor reports unused indexes on the newly created, not-yet-workloaded tables; do not remove indexes solely on that basis.

## Implementation status

The database contains transactional award and redemption RPCs. A server-side redemption route now exists at `POST /api/rewards/{rewardId}/redeem`: it validates the bearer token through Supabase Auth, derives the user ID from the verified Auth response, and calls the `service_role`-only RPC. The route never trusts a client-supplied user ID. It requires `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` as server environment variables; the service-role key must never be exposed to browser code. The route has not yet been exercised end-to-end against an authenticated user or seeded reward.

The award RPC remains callable only by `service_role` and assumes the calling server has already verified provider authenticity, freshness, and campaign mapping. It serializes campaign caps, rejects inactive users and unapproved advertisers, deduplicates provider events, and writes the verified event, ledger credit, and audit event atomically. The redemption RPC locks the consumer profile and reward/inventory, checks active account, published reward, approved vendor, available stock and ledger balance, then creates the redemption, debit, inventory reservation, event, and audit row in one transaction. Retries with the same consumer/idempotency key return the existing redemption. Consumer sign-in UI/session lifecycle, provider signature adapters, membership authorization policies, vendor state-transition authorization, cancellation/reversal workflows, rate limiting, and reconciliation jobs remain unimplemented. Server routes for the published rewards catalogue, authenticated points balance, and redemption are implemented but require end-to-end tests. No production users, campaigns, points, rewards, or redemptions have been seeded. Do not treat this foundation as production-ready.

## Transactional RPC security boundary

- All four RPCs are `SECURITY DEFINER` with an empty `search_path`, owned by `postgres`, and executable only by `service_role`.
- `award_verified_engagement` is executable only by `service_role`; provider verification must occur before invocation in a trusted server adapter.
- `redeem_reward` is executable only by `service_role`. The API server must validate the user's access token with Supabase Auth and pass only the verified user ID. Never expose a service-role key to browser code.
- `list_published_rewards` exposes only published rewards from approved vendors through the server catalogue route.
- `get_points_balance` returns only the verified consumer's ledger-derived balance through the authenticated points route.
- The redemption HTTP route validates Auth tokens server-side and does not accept a client-supplied user ID. It still requires end-to-end integration tests and rate limiting before public exposure.
- The RPCs and route have not yet been exercised with real or synthetic user/reward fixtures.

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