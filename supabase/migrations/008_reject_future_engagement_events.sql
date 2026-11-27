-- Defense in depth: never accept a future-dated provider event.
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

  if not exists (
    select 1 from public.organizations o
    where o.id = v_campaign.advertiser_organization_id
      and o.organization_type = 'advertiser' and o.status = 'approved'
  ) then
    raise exception 'advertiser_not_approved' using errcode = '42501';
  end if;

  if v_campaign.status <> 'active'
     or (v_campaign.starts_at is not null and v_campaign.starts_at > pg_catalog.now())
     or (v_campaign.ends_at is not null and v_campaign.ends_at <= pg_catalog.now())
     or (v_campaign.starts_at is not null and p_occurred_at < v_campaign.starts_at)
     or (v_campaign.ends_at is not null and p_occurred_at > v_campaign.ends_at)
     or p_occurred_at > pg_catalog.now() then
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

commit;
