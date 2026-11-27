# Architecture and Data Model

## High-level architecture
- Client: renders catalogue, campaigns, points history, and redemption status. It is never authoritative for balances, eligibility, inventory, or provider verification.
- Application API: authenticates callers, validates input, applies authorization, and invokes transactional domain services.
- PostgreSQL: source of truth for accounts, campaigns, provider events, ledger entries, rewards, inventory, redemptions, and audit records.
- Provider adapters: verify signed callbacks from approved rewarded-ad or campaign providers.
- Background workers: process retries, expiry, notifications, reconciliation, and fulfilment reminders.
- Admin interface: separate privileged workflows with strong authorization and audit logging.

## Domain modules
Identity and access; campaign management; engagement verification; points ledger; reward catalogue and inventory; redemption and fulfilment; vendor management; advertiser management; notifications; audit, support, and reporting.

Keep domain logic in server-side services. Database policies are defense in depth, not a replacement for server authorization. The database currently exposes two transactional primitives to `service_role` only: `award_verified_engagement` and `redeem_reward`. The application API must authenticate the consumer with Supabase Auth, derive the user ID from the verified session, and only then call the redemption RPC using its server-only service credential. Never pass through a client-supplied user ID or expose the service credential to the browser. The award RPC may be called only after a trusted provider adapter verifies the provider signature, event freshness, and campaign mapping.

## Suggested relational entities
- profiles: user metadata and account status
- role_assignments: server-managed role grants and revocations
- vendors and vendor_memberships: vendor organizations and scoped membership
- advertisers and advertiser_memberships: advertiser organizations and scoped membership
- campaigns: fixed campaign rules, schedule, limits, sponsor, and status
- campaign_eligibility: explicit eligibility constraints
- engagement_events: provider event identity, verification status, and deduplication key
- points_accounts: optional cached balance, reconciled against the ledger
- points_ledger: immutable grants, debits, expiries, and compensating entries
- rewards: fixed reward definition, vendor, point cost, and publication state
- reward_inventory: available, reserved, and fulfilled quantities
- redemptions: consumer-selected reward, point debit, state, and idempotency key
- fulfilment_events: vendor updates and fulfilment evidence
- support_cases: disputes and resolution metadata
- audit_events: privileged actions and security-relevant events
- consent_records: policy version, purpose, and timestamp

## Transactional invariants

### Grant points
Within one database transaction:
1. The trusted adapter validates provider signature, freshness, and campaign mapping before invoking the RPC.
2. The RPC locks the campaign and consumer profile, then checks active campaign window, approved advertiser, and active account.
3. Insert the provider event under a unique provider/event identifier; duplicates return without a second grant.
4. Enforce per-user and total campaign event caps while holding the campaign lock.
5. Insert one immutable ledger credit and audit event in the same transaction.
6. Commit. Any cap or ledger failure rolls back the event insert as well.

A client-provided verification flag is never accepted as evidence.

### Redeem points
Within one database transaction:
1. The application API validates the Supabase Auth session and derives the consumer ID server-side; only `service_role` may invoke the database RPC.
2. The RPC locks the consumer profile, then checks the active account and idempotency key.
3. Lock the published reward and its inventory; require an approved vendor and available stock.
4. Calculate the authoritative balance from the ledger and verify sufficient points.
5. Insert the redemption record and immutable ledger debit.
6. Reserve inventory and write redemption/audit events.
7. Commit and return the redemption identifier. Any failure rolls back all changes.

Retries with the same idempotency key return the original redemption. Any failure rolls back all changes.

### Cancel or reverse
Never delete or rewrite a ledger entry. Use a compensating entry linked to the original. Release reserved stock only when the redemption state machine permits it.

## Redemption state machine
requested -> reserved -> accepted_by_vendor -> fulfilled

Alternative terminal paths:
- requested -> rejected
- reserved -> cancelled
- accepted_by_vendor -> disputed
- disputed -> resolved

Transitions are validated server-side and recorded as events. A vendor may update only redemptions assigned to that vendor.

## Security and tenancy
- Enforce organization membership and role scope in every server-side operation.
- Apply row-level security where supported, with deny-by-default policies.
- Keep service-role keys and provider secrets exclusively in server-side secret storage.
- Verify webhook signatures, timestamps, and replay windows.
- Rate-limit authentication, campaign completion, redemption, and support endpoints.
- Use opaque identifiers, parameterized queries, and strict schema validation.
- Avoid logging tokens or unnecessary personal information.
- Separate development, staging, and production environments.
- Review migrations and test them against disposable databases.

## Reporting
Prefer aggregate counts and totals. Advertisers should not receive consumer-level behavioral profiles. Vendor reporting is limited to its own campaigns and redemptions. Admin access to personal data must be justified and audited.
