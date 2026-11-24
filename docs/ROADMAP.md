# Implementation Roadmap

This roadmap is gated. A phase is complete only when its evidence is committed and reviewed.

## Phase 0: Product boundary
- [x] Establish deterministic rewards-only product definition.
- [x] Document MVP, architecture, security model, and delivery gates.
- [ ] Confirm launch market, legal review owner, and operational owner.
- [ ] Confirm hosting, database, and authentication choices.

## Phase 1: Engineering foundation
- [ ] Scaffold application and typed domain modules.
- [ ] Add formatting, linting, type checking, unit tests, and CI.
- [ ] Add environment validation and safe example configuration.
- [ ] Add database migration framework and disposable test database.
- [ ] Add structured logging with sensitive-data redaction.

Exit gate: clean CI, reproducible local setup, no secrets in repository.

## Phase 2: Identity and tenancy
- [ ] Implement authentication and account lifecycle.
- [ ] Implement server-managed roles and organization memberships.
- [ ] Add authorization tests for consumer, vendor, advertiser, operator, and support roles.
- [ ] Add audit events for privileged actions.

Exit gate: cross-tenant access tests pass; unauthorized role escalation is blocked.

## Phase 3: Campaign and verified engagement
- [ ] Implement fixed-rule campaigns and explicit eligibility.
- [ ] Define provider adapter interface.
- [ ] Integrate only a provider whose terms permit rewarded views.
- [ ] Verify signed callbacks and replay protection.
- [ ] Implement event deduplication and campaign caps.

Exit gate: replayed, forged, stale, and client-fabricated events cannot grant points.

## Phase 4: Points ledger
- [ ] Implement immutable ledger entries and balance projection.
- [ ] Implement grants, debits, expiry, and compensating entries.
- [ ] Add idempotency and transactional concurrency tests.
- [ ] Add reconciliation job and mismatch alerts.

Exit gate: ledger invariants and concurrency tests pass.

## Phase 5: Rewards and redemption
- [ ] Implement reward catalogue and inventory.
- [ ] Implement deterministic redemption transaction.
- [ ] Implement reservation, cancellation, and fulfilment state machine.
- [ ] Add consumer receipt and redemption history.
- [ ] Add vendor fulfilment interface.

Exit gate: no overspending, double reservation, or redemption of unavailable rewards under concurrent load.

## Phase 6: Advertiser and operations portals
- [ ] Implement advertiser campaign submission and review.
- [ ] Implement vendor onboarding and reward approval.
- [ ] Implement admin workflows, support cases, and audit search.
- [ ] Implement aggregate reporting and export controls.

Exit gate: organization scoping, approval controls, and audit evidence pass review.

## Phase 7: Pre-launch assurance
- [ ] Independent security review and remediation.
- [ ] Privacy and market-specific legal review.
- [ ] Backup and isolated restore test.
- [ ] Load, accessibility, and mobile usability testing.
- [ ] Incident response and support runbooks.
- [ ] Production readiness review with evidence.

Exit gate: explicit owner approval before production launch.

## Permanent exclusions
No phase may add spins, draws, lotteries, chance-based campaigns, random winners, paid entries, paid chances, cash-out, or random prize allocation.
