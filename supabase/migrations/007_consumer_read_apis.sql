-- Read-only consumer-facing data APIs. All functions remain server-role-only;
-- the Next.js server routes control which fields leave the database.

begin;

create or replace function public.list_published_rewards()
returns table (
  id uuid,
  title text,
  description text,
  points_cost integer,
  eligibility_text text,
  fulfilment_terms text,
  vendor_name text,
  available_quantity integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    r.title,
    r.description,
    r.points_cost,
    r.eligibility_text,
    r.fulfilment_terms,
    o.legal_name as vendor_name,
    (i.total_quantity - i.reserved_quantity - i.fulfilled_quantity)::integer as available_quantity
  from public.rewards r
  join public.organizations o
    on o.id = r.vendor_organization_id
   and o.organization_type = 'vendor'
   and o.status = 'approved'
  join public.reward_inventory i on i.reward_id = r.id
  where r.status = 'published'
  order by r.created_at desc, r.id;
$$;

revoke all on function public.list_published_rewards() from public, anon, authenticated;
grant execute on function public.list_published_rewards() to service_role;


create or replace function public.get_points_balance(p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_balance numeric;
begin
  if p_user_id is null then
    raise exception 'verified_user_id_required' using errcode = '28000';
  end if;

  select account_status into v_status
  from public.profiles
  where id = p_user_id;

  if not found or v_status <> 'active' then
    raise exception 'account_not_eligible' using errcode = '42501';
  end if;

  select coalesce(sum(points_delta), 0) into v_balance
  from public.points_ledger
  where user_id = p_user_id;

  return v_balance::text;
end;
$$;

revoke all on function public.get_points_balance(uuid) from public, anon, authenticated;
grant execute on function public.get_points_balance(uuid) to service_role;

commit;
