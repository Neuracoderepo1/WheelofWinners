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

Keep domain logic in server-side services. Database policies are defense in depth, not a replacement for server authorization.

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
1. Validate provider signature and event authenticity in the trusted adapter.
2. Insert the provider event under a unique provider/event identifier.
3. If it already exists, return the prior result without a second grant.
4. Validate campaign state, user eligibility, and all caps.
5. Insert one immutable ledger credit.
6. Update any cached balance in the same transaction.
7. Commit.

A client-provided verification flag is never accepted as evidence.

### Redeem points
Within one database transaction:
1. Require an authenticated consumer and a unique idempotency key.
2. Lock the relevant points account and reward inventory row in a consistent order.
3. Validate reward publication, schedule, eligibility, point cost, and available stock.
4. Verify sufficient available points.
5. Insert a redemption record.
6. Insert an immutable ledger debit.
7. Reserve inventory.
8. Commit and return the redemption identifier.

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
