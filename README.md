# WheelofWinners

A deterministic rewards and customer-engagement platform connecting consumers, brands, vendors, and advertisers.

## Product rule
WheelofWinners is a loyalty and rewards marketplace, not a game of chance. Users earn points through disclosed, eligible activities and redeem them for rewards whose price, eligibility, availability, and fulfilment terms are known before redemption.

The product must not implement spins for prizes, random winners, prize draws, lotteries, chance-based campaigns, paid entries, paid chances, random reward allocation, or mechanics that disguise chance as loyalty.

## Core modules
1. Consumer accounts and profiles
2. Campaign discovery and eligibility
3. Verified engagement events and points ledger
4. Rewards catalogue and inventory
5. Deterministic points redemption
6. Redemption status and fulfilment tracking
7. Vendor portal and product management
8. Advertiser campaign portal and reporting
9. Operations and compliance console
10. Audit logs, fraud monitoring, and support workflows

## Non-negotiable principles
- Points are earned only from server-verified events.
- Never trust a client-submitted verification boolean, screenshot, or self-reported completion as proof of an ad view.
- Rewarded advertising may be integrated only through providers and placements that expressly permit incentivized views. Never reward ad clicks.
- Reward costs, point requirements, stock, eligibility, expiry, and fulfilment terms are visible before confirmation.
- Redemption is deterministic: a valid request receives the exact selected reward if all checks pass, otherwise it fails with a clear reason.
- Use an append-only points ledger with compensating entries rather than editing historical balances.
- Use idempotency keys and database transactions for point grants and redemptions.
- No cash deposits, paid entries, cash-out, user-to-user transfers, or random prize allocation in the initial product.
- Protect personal data, minimize collection, and provide appropriate privacy workflows.
- Do not target children with manipulative engagement mechanics. Obtain market-specific legal review for age, consent, advertising, consumer-protection, tax, and data-protection requirements.

## Suggested initial stack
- Web: Next.js + TypeScript
- Data and authentication: PostgreSQL with Supabase Auth/RLS, subject to architecture review
- Business logic: trusted server functions / API routes
- Payments: excluded from MVP
- Hosting: only after secrets, access controls, migrations, and CI are verified

## Documentation
- Product specification: docs/PRODUCT_SPEC.md
- Architecture: docs/ARCHITECTURE.md
- Security model: docs/SECURITY_MODEL.md
- Roadmap: docs/ROADMAP.md

## Repository status
This repository is being initialized. These first commits establish the product boundary, architecture, security model, and delivery sequence. No production system, vendor integrations, ad-provider callbacks, or fulfilment integrations are implied until implemented and verified.
