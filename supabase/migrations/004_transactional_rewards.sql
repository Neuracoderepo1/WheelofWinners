-- WheelofWinners transactional loyalty operations.
-- Engagement awards are callable only by trusted server service_role after
-- an external provider adapter verifies the event signature and freshness.
-- Redemptions derive the consumer identity from auth.uid(); callers cannot
-- choose another user's ID. No cash value or cash-out is represented.

begin;

create or replace function public.award_verified_engagement(
  p_user_id uuid,
  p_campaign_id uuid,
  p_provider_code text,
  p_provider_event_id text,
  p_occurred_at timestamptz,
  p_verification_method text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.campaigns%rowtype;
  v_profile public.profiles%rowtype;
  v_event_id uuid;
  v_rows integer;
  v_user_count bigint;
  v_total_count bigint;
  v_points integer;
  v_key text;
begin
  if p_user_id is null or p_campaign_id is null
     or p_provider_code is null or length(pg_catalog.btrim(p_provider_code)) not between 2 and 80
     or p_provider_event_id is null or length(pg_catalog.btrim(p_provider_event_id)) not between 1 and 200
     or p_occurred_at is null
     or p_verification_method is null or length(pg_catalog.btrim(p_verification_method)) not between 2 and 120 then
    raise exception 'invalid_verified_engagement_input' using errcode = '22023';
  end if;

  -- Serialize campaign caps and account state changes.
  select * into v_campaign
  from public.campaigns
  where id = p_campaign_id
  for update;

  if not found then
    raise exception 'campaign_not_found' using errcode = 'P0002';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found or v_profile.account_status <> 'active' then
    raise exception 'account_not_eligible' using errcode = '42501';
  end if;

  if v_campaign.status <> 'active'
     or (v_campaign.starts_at is not null and v_campaign.starts_at > pg_catalog.now())
     or (v_campaign.ends_at is not null and v_campaign.ends_at <= pg_catalog.now())
     or (v_campaign.starts_at is not null and p_occurred_at < v_campaign.starts_at)
     or (v_campaign.ends_at is not null and p_occurred_at > v_campaign.ends_at) then
    raise exception 'campaign_not_active_or_event_outside_window' using errcode = '22023';
  end if;

  -- Unique provider identity is the primary replay barrier.
  insert into public.verified_engagement_events (
    campaign_id, user_id, provider_code, provider_event_id,
    occurred_at, verification_method, points_awarded
  ) values (
    p_campaign_id, p_user_id, p_provider_code, p_provider_event_id,
    p_occurred_at, p_verification_method, v_campaign.points_per_verified_event
  )
  on conflict (provider_code, provider_event_id) do nothing
  returning id into v_event_id;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return pg_catalog.jsonb_build_object('status', 'duplicate', 'awarded', false);
  end if;

  select pg_catalog.count(*) into v_user_count
  from public.verified_engagement_events
  where campaign_id = p_campaign_id and user_id = p_user_id;

  select pg_catalog.count(*) into v_total_count
  from public.verified_engagement_events
  where campaign_id = p_campaign_id;

  if v_campaign.per_user_limit is not null and v_user_count > v_campaign.per_user_limit then
    raise exception 'campaign_per_user_limit_reached' using errcode = '22023';
  end if;
  if v_campaign.total_event_limit is not null and v_total_count > v_campaign.total_event_limit then
    raise exception 'campaign_total_limit_reached' using errcode = '22023';
  end if;

  v_points := v_campaign.points_per_verified_event;
  v_key := 'engagement:' || p_provider_code || ':' || p_provider_event_id;

  insert into public.points_ledger (
    user_id, entry_type, points_delta, source_event_id, idempotency_key, note
  ) values (
    p_user_id, 'earn', v_points, v_event_id, v_key, 'Verified campaign engagement'
  );

  insert into public.audit_events (
    actor_user_id, action, resource_type, resource_id, metadata
  ) values (
    null, 'points_awarded', 'verified_engagement_event', v_event_id,
    pg_catalog.jsonb_build_object(
      'campaign_id', p_campaign_id,
      'user_id', p_user_id,
      'provider_code', p_provider_code,
      'points', v_points
    )
  );

  return pg_catalog.jsonb_build_object(
    'status', 'awarded',
    'awarded', true,
    'event_id', v_event_id,
    'points', v_points
  );
end;
$$;

revoke all on function public.award_verified_engagement(uuid, uuid, text, text, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.award_verified_engagement(uuid, uuid, text, text, timestamptz, text)
  to service_role;


create or replace function public.redeem_reward(
  p_reward_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_profile public.profiles%rowtype;
  v_reward public.rewards%rowtype;
  v_inventory public.reward_inventory%rowtype;
  v_existing public.redemptions%rowtype;
  v_balance bigint;
  v_redemption_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if p_reward_id is null or p_idempotency_key is null
     or length(pg_catalog.btrim(p_idempotency_key)) not between 8 and 128 then
    raise exception 'invalid_redemption_input' using errcode = '22023';
  end if;

  -- A per-consumer row lock serializes all balance-changing operations.
  select * into v_profile
  from public.profiles
  where id = v_user_id
  for update;

  if not found or v_profile.account_status <> 'active' then
    raise exception 'account_not_eligible' using errcode = '42501';
  end if;

  select * into v_existing
  from public.redemptions
  where user_id = v_user_id and idempotency_key = p_idempotency_key;

  if found then
    return pg_catalog.jsonb_build_object(
      'status', v_existing.status,
      'redemption_id', v_existing.id,
      'duplicate', true
    );
  end if;

  select * into v_reward
  from public.rewards
  where id = p_reward_id
  for update;

  if not found or v_reward.status <> 'published' then
    raise exception 'reward_unavailable' using errcode = 'P0002';
  end if;

  select * into v_inventory
  from public.reward_inventory
  where reward_id = p_reward_id
  for update;

  if not found or
     (v_inventory.total_quantity - v_inventory.reserved_quantity - v_inventory.fulfilled_quantity) < 1 then
    raise exception 'reward_out_of_stock' using errcode = '22023';
  end if;

  select coalesce(pg_catalog.sum(points_delta), 0)::bigint into v_balance
  from public.points_ledger
  where user_id = v_user_id;

  if v_balance < v_reward.points_cost then
    raise exception 'insufficient_points' using errcode = '22023';
  end if;

  insert into public.redemptions (
    user_id, reward_id, points_cost, status, idempotency_key
  ) values (
    v_user_id, p_reward_id, v_reward.points_cost, 'reserved', p_idempotency_key
  )
  returning id into v_redemption_id;

  insert into public.points_ledger (
    user_id, entry_type, points_delta, redemption_id, idempotency_key, note
  ) values (
    v_user_id, 'redeem', -v_reward.points_cost, v_redemption_id,
    'redemption:' || p_idempotency_key, 'Fixed-price reward redemption'
  );

  update public.reward_inventory
  set reserved_quantity = reserved_quantity + 1,
      updated_at = pg_catalog.now()
  where reward_id = p_reward_id;

  insert into public.redemption_events (
    redemption_id, actor_user_id, event_type, note
  ) values (
    v_redemption_id, v_user_id, 'reserved', 'Consumer redemption reserved'
  );

  insert into public.audit_events (
    actor_user_id, action, resource_type, resource_id, metadata
  ) values (
    v_user_id, 'reward_redeemed', 'redemption', v_redemption_id,
    pg_catalog.jsonb_build_object(
      'reward_id', p_reward_id,
      'points_cost', v_reward.points_cost
    )
  );

  return pg_catalog.jsonb_build_object(
    'status', 'reserved',
    'redemption_id', v_redemption_id,
    'points_cost', v_reward.points_cost,
    'duplicate', false
  );
end;
$$;

revoke all on function public.redeem_reward(uuid, text) from public, anon;
grant execute on function public.redeem_reward(uuid, text) to authenticated;

commit;
