# Server API surface

All endpoints are implemented as Next.js Node.js route handlers. The database RPCs are server-role-only; browser code must never receive the Supabase service-role credential.

## Configuration

Set these server environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Never use a `NEXT_PUBLIC_` prefix for the service-role key. Do not commit real credentials.

## Endpoints

### `GET /api/rewards`

Returns only published rewards belonging to approved vendors and their currently available inventory count. The server calls the restricted `list_published_rewards()` database function.

### `GET /api/me/points`

Requires `Authorization: Bearer <supabase-access-token>`. The server validates the token through Supabase Auth, derives the user ID from the verified response, and calls the restricted `get_points_balance(p_user_id)` function. The balance is returned as a decimal string to avoid integer precision loss in JavaScript clients.

### `POST /api/rewards/{rewardId}/redeem`

Requires `Authorization: Bearer <supabase-access-token>` and JSON:

```json
{ "idempotencyKey": "client-generated-stable-key" }
```

The server validates the Auth token and derives the user ID. It ignores any client-supplied user ID. The database performs the balance, reward, vendor, and inventory checks in one transaction. The client must reuse the same idempotency key when retrying the same logical redemption.

## Current limitations

- No sign-in/sign-up UI or session lifecycle is implemented yet.
- No provider callback endpoint exists. Point awards must not be enabled until a trusted provider adapter verifies signatures, freshness, and campaign mapping.
- Vendor and advertiser management/state-transition APIs are not implemented.
- Rate limiting, abuse monitoring, and end-to-end tests with disposable Auth/reward fixtures are required before public traffic.
- The catalogue is empty until approved vendors publish rewards and inventory is seeded through an authorized operational workflow.
