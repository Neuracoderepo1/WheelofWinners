# Security, Abuse, and Compliance Model

## Trust boundaries
Treat browser/mobile input, query parameters, local storage, screenshots, and client-side completion messages as untrusted. Only server-verified provider callbacks or approved server-side checks may authorize points.

## Authentication and authorization
- Supabase Auth is the identity provider; `profiles.id` references `auth.users.id` and a database trigger provisions a minimal profile on Auth-user creation.
- The current server API verifies bearer tokens by calling Supabase Auth's user endpoint. It derives user IDs from the verified response, never from request JSON.
- The service-role credential is used only by server route handlers and must never be exposed to the browser or committed.
- All current RPCs are `SECURITY DEFINER`, use an empty `search_path`, and are executable only by `service_role`.
- RLS is enabled on all application tables with no client policies. This is intentionally fail-closed; direct browser database access is not enabled.
- Secure session lifecycle, sign-in UI, and MFA for privileged accounts remain to be implemented.
- Require verified email for account-sensitive actions.
- Require MFA for operators and privileged vendor/advertiser accounts where supported.
- Store roles and organization memberships server-side.
- Enforce least privilege and deny-by-default access.
- Revoke sessions and memberships promptly when accounts are suspended.

## Points integrity
- Append-only ledger for all balance-affecting entries.
- Unique idempotency constraints for provider events and redemption requests.
- Transactional balance and inventory changes through server-only database functions.
- A unique partial index allows at most one earn ledger entry per verified event and one redemption debit per redemption.
- Campaign caps are serialized with a campaign row lock; account status and organization approval are checked under row locks.
- Compensating entries for corrections.
- Scheduled reconciliation between cached balances and ledger totals.
- Alert on negative balances, unusual earning velocity, callback failures, and reconciliation mismatches.

## Reward and inventory abuse
- Lock consumer profile, reward, approved vendor organization, and inventory rows during reservation.
- Prevent duplicate redemption with unique idempotency keys.
- Apply campaign and account limits server-side.
- Require vendor approval before publishing rewards.
- Track stock adjustments and fulfilment transitions.
- Escalate suspected fake fulfilment and repeated consumer disputes for manual review.

## Provider callback security
- Verify provider signatures using documented algorithms.
- Validate timestamp and replay window.
- Persist unique provider event identifiers.
- Reject unsigned, stale, malformed, or duplicate events.
- Keep provider secrets out of source control and client bundles.
- Never create a production bypass or public-client test flag.

## Privacy and consumer protection
Before launch in each country, obtain qualified review of data protection, advertising, consumer protection, tax, promotion, and age-related obligations. Collect only data necessary for service delivery. Publish clear privacy, points, reward, cancellation, and complaint terms.

Do not use manipulative streaks, pressure timers, deceptive scarcity, or behavioral advertising directed at minors. Do not introduce cash deposits, paid entries, cash-out, transferable balances, or chance-based reward allocation.

## Operational controls
- Separate development, staging, and production credentials.
- Back up the database and periodically test restoration in an isolated environment.
- Maintain incident response and escalation procedures.
- Audit privileged access and sensitive changes.
- Keep dependencies patched and run static analysis, dependency scanning, and automated tests in CI.
- Do not claim compliance or production readiness without documented evidence.
