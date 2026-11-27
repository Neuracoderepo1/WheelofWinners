# Local Development

## Requirements
- Node.js 22
- npm

## Setup
1. Clone the repository.
2. Copy .env.example to .env.local. No values are currently required.
3. Run npm install.
4. Run npm run dev and open the local address printed by Next.js.

## Validation
- npm run typecheck
- npm run lint
- npm test
- npm run build

## Current limitations
The current application is a UI and domain-rule foundation only. The reward cards are illustrative examples. Authentication, persistence, verified engagement providers, points issuance, vendor operations, and fulfilment are not connected. Do not represent sample points or sample rewards as real account data.

All authoritative points grants and redemptions must be implemented server-side with database transactions, idempotency, authorization, audit records, and concurrency tests before any live use.
