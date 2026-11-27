# Server API surface

All endpoints are implemented as Next.js Node.js route handlers. The database RPCs are server-role-only; browser code must never receive the Supabase service-role credential.

## Configuration

Server environment:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Browser-safe environment:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The public key is safe for browser use when RLS is correctly configured. Never use a `NEXT_PUBLIC_` prefix for the service-role key. Do not commit real credentials.

## Consumer authentication

### `/auth`

The consumer authentication screen uses Supabase email OTP:
1. The user submits an email address.
2. Supabase Auth sends a one-time code.
3. The user enters the six-digit code.
4. The browser verifies it with `auth.verifyOtp({ email, token, type: "email" })`.
5. The Supabase JS client persists and refreshes the resulting session in browser storage.
6. Sign-out calls Supabase Auth and clears the local session.

The UI does not create application-managed passwords. Session access tokens are sent as bearer tokens to protected Next.js routes. The server independently validates each token with Supabase Auth and derives the user ID from the verified response.

**Supabase project configuration required before live use:** Email provider enabled; the Auth > Email > Magic Link template must contain the OTP variable `{{ .Token }}` rather than only a magic-link URL; email delivery/SMTP must be configured and tested; the production site URL and allowed redirect URLs must match the deployed domain. The linked Supabase management integration does not expose these Auth template and SMTP settings, so their live state is not certified by this repository change.

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

- Email OTP UI and browser session lifecycle are implemented in the application branch, but live email delivery and template configuration are not yet verified.
- No provider callback endpoint exists. Point awards must not be enabled until a trusted provider adapter verifies signatures, freshness, and campaign mapping.
- Vendor and advertiser management/state-transition APIs are not implemented.
- Rate limiting, abuse monitoring, and end-to-end tests with disposable Auth/reward fixtures are required before public traffic.
- The catalogue is empty until approved vendors publish rewards and inventory is seeded through an authorized operational workflow.
