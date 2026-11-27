# PostgreSQL Data Foundation

This migration establishes the first relational model for WheelofWinners as a deterministic loyalty service. It is a schema baseline, not a complete backend or production deployment.

## Migration

Apply `001_initial_loyalty_foundation.sql` only to a disposable development database first. It targets PostgreSQL 15+ and deliberately does not assume a particular authentication provider. `profiles.id` must be mapped to the authenticated identity by the server-side auth adapter.

## Security properties

- Row-level security is enabled on every application table. No permissive client policies are created, so direct client access is denied until reviewed policies or server-only access paths are deliberately added.
- A verified engagement event is recorded only after a trusted server adapter validates provider authenticity, event freshness, campaign mapping, and replay protection.
- Provider event IDs and redemption idempotency keys are unique.
- Points are represented as immutable ledger deltas. Corrections use compensating entries, never edits or deletes.
- Reward prices are fixed integer point costs. Inventory distinguishes reserved and fulfilled stock.
- No cash balance, transfer, cash-out, paid entry, spin, draw, or random reward allocation is represented.

## Deliberate follow-up work

This migration does **not** yet implement the transactional earning/redemption service, auth-provider foreign keys, membership authorization policies, provider signature adapters, campaign cap enforcement, vendor state-transition authorization, inventory reservation RPC, or reconciliation jobs. Those must be added and tested before any real user data is stored.

## Required database tests

1. Anonymous and ordinary client roles cannot read or write protected tables without an explicit policy.
2. Duplicate provider event IDs cannot create duplicate verified events.
3. Ledger UPDATE and DELETE fail.
4. Duplicate user/idempotency-key pairs fail for both grants and redemptions.
5. Concurrent redemption attempts cannot overspend points or reserve stock twice once the transactional service is implemented.
6. Vendor members cannot access another vendor's rewards or redemptions.
7. Advertiser members cannot access consumer-level event histories.
8. Suspended accounts cannot earn or redeem.
