-- Tighten redemption RPC boundary: only trusted server service_role may call it.
-- The application server must validate the caller's Supabase access token with
-- Auth getUser(), then pass that verified user ID. Browser clients never receive
-- a service-role credential and cannot execute this SECURITY DEFINER function.

begin;

drop function public.redeem_reward(uuid, text);

create function public.redeem_reward(
  p_user_id uuid,
  p_reward_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_reward public.rewards%rowtype;
  v_inventory public.reward_inventory%rowtype;
  v_existing public.redemptions%rowtype;
  v_balance bigint;
  v_redemption_id uuid;
begin
  if p_user_id is null then
    raise exception 'verified_user_id_required' using errcode = '28000';
  end if;
  if p_reward_id is null or p_idempotency_key is null
     or length(pg_catalog.btrim(p_idempotency_key)) not between 8 and 128 then
    raise exception 'invalid_redemption_input' using errcode = '22023';
  end if;

  -- The only executable role is service_role. The API server must derive
  -- p_user_id from a verified Supabase Auth session, never request JSON.
  select * into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found or v_profile.account_status <> 'active' then
    raise exception 'account_not_eligible' using errcode = '42501';
  end if;

  select * into v_existing
  from public.redemptions
  where user_id = p_user_id and idempotency_key = p_idempotency_key;

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
  if not exists (
    select 1 from public.organizations o
    where o.id = v_reward.vendor_organization_id
      and o.organization_type = 'vendor' and o.status = 'approved'
  ) then
    raise exception 'vendor_not_approved' using errcode = '42501';
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
  where user_id = p_user_id;

  if v_balance < v_reward.points_cost then
    raise exception 'insufficient_points' using errcode = '22023';
  end if;

  insert into public.redemptions (
    user_id, reward_id, points_cost, status, idempotency_key
  ) values (
    p_user_id, p_reward_id, v_reward.points_cost, 'reserved', p_idempotency_key
  )
  returning id into v_redemption_id;

  insert into public.points_ledger (
    user_id, entry_type, points_delta, redemption_id, idempotency_key, note
  ) values (
    p_user_id, 'redeem', -v_reward.points_cost, v_redemption_id,
    'redemption:' || p_idempotency_key, 'Fixed-price reward redemption'
  );

  update public.reward_inventory
  set reserved_quantity = reserved_quantity + 1,
      updated_at = pg_catalog.now()
  where reward_id = p_reward_id;

  insert into public.redemption_events (
    redemption_id, actor_user_id, event_type, note
  ) values (
    v_redemption_id, p_user_id, 'reserved', 'Consumer redemption reserved'
  );

  insert into public.audit_events (
    actor_user_id, action, resource_type, resource_id, metadata
  ) values (
    p_user_id, 'reward_redeemed', 'redemption', v_redemption_id,
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

revoke all on function public.redeem_reward(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.redeem_reward(uuid, uuid, text) to service_role;

commit;
