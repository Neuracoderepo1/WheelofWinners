# Product and MVP Specification

## Product definition
WheelofWinners helps brands and vendors run measurable customer-engagement campaigns and lets consumers redeem earned points for guaranteed, listed rewards.

It is a deterministic loyalty marketplace. It does not award prizes randomly.

## User roles
- Consumer: discovers campaigns, completes eligible actions, sees points history, and redeems points.
- Vendor: submits products, maintains stock, confirms and fulfils assigned redemptions.
- Advertiser: creates sponsored campaigns, sets budgets and eligibility, and reviews aggregate performance.
- Operator: reviews vendors and campaigns, manages catalogue quality, handles disputes, and monitors abuse.
- Support agent: handles customer cases with least-privilege access and an audit trail.

Role assignment is server-controlled. Users cannot grant themselves privileged roles.

## Consumer journey
1. Register and complete the minimum required profile.
2. Review campaigns, eligibility, point value, limits, and expiry.
3. Complete a qualifying activity.
4. The server verifies the activity using a trusted provider callback or approved server-side evidence.
5. A ledger transaction credits points exactly once.
6. Browse rewards and inspect point cost, stock, restrictions, and fulfilment terms.
7. Confirm redemption.
8. The server atomically checks balance, eligibility, inventory, and idempotency, then debits points and reserves the reward.
9. Track fulfilment and raise a support request if needed.

No random spin or draw appears in this journey.

## MVP scope
Included:
- Secure accounts and consent records.
- Campaign catalogue with fixed eligibility and fixed rewards.
- Server-verified completion events.
- Append-only points ledger and derived balance.
- Rewards catalogue with fixed point prices and inventory.
- Deterministic redemption and reservation.
- Vendor onboarding with operator approval.
- Vendor fulfilment status updates.
- Advertiser campaign submission, subject to operator approval.
- Admin console for campaigns, inventory, disputes, users, and audit events.
- Aggregate, privacy-conscious reporting.

Excluded:
- Spins, lotteries, sweepstakes, draws, randomized winners, loot-box mechanics, and random prize assignment.
- Paid participation, deposits, entry fees, cash-out, and peer-to-peer transfers.
- Rewarding ad clicks or fabricated ad-completion events.
- Cryptocurrency and stored-value wallet functionality.
- Unreviewed ad networks or automatic vendor self-publication.

## Points policy
- Points are promotional loyalty units, not cash or a transferable financial instrument.
- Each earning rule states the qualifying action, point amount, limits, expiry, and reversal conditions.
- Points are granted only after server-side verification.
- Every grant, redemption, expiry, adjustment, and reversal is a distinct immutable ledger entry.
- Corrections use compensating entries linked to the original transaction.
- A client may request an action but cannot set its own point amount or balance.

## Reward policy
Every listing includes vendor, description, fixed point cost, stock, eligibility, expiry, delivery or pickup terms, fulfilment responsibility, and cancellation/dispute terms. A reward is not redeemable when it cannot be fulfilled. Substitutions require explicit consumer acceptance.

## Advertising policy
- Use only ad products whose written terms permit rewarded viewing.
- Reward a qualifying view only where the provider supports server-side verification.
- Never reward clicks.
- Do not fabricate callbacks, simulate views, or infer completion from elapsed client time.
- Apply per-user, per-campaign, and per-provider caps.
- Disclose sponsorship and material campaign conditions.
- Do not profile or target minors with behavioral advertising. Obtain launch-market legal review.

## Launch acceptance criteria
- A consumer cannot mint points from client requests.
- Replayed provider callbacks cannot credit points twice.
- Concurrent redemptions cannot overspend a balance or reserve the same stock twice.
- Every balance change has an auditable ledger entry.
- Unavailable, expired, or ineligible rewards cannot be redeemed.
- Vendor and advertiser access is tenant-scoped.
- Admin actions are authenticated, authorized, and audited.
- No chance-based or paid-entry mechanic exists in UI, API, database, jobs, or tests.
- Privacy, advertising, consumer-protection, and market-specific legal reviews are complete before public launch.
