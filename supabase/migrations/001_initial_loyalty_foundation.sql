-- WheelofWinners deterministic loyalty data foundation
-- PostgreSQL 15+. Identity is supplied by the application auth adapter.
-- No client-facing policies are granted by this migration; access is deny-by-default.

begin;

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key,
  account_status text not null default 'active'
    check (account_status in ('active', 'suspended', 'closed')),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  organization_type text not null
    check (organization_type in ('vendor', 'advertiser')),
  legal_name text not null check (length(trim(legal_name)) between 2 and 200),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'suspended', 'closed')),
  created_at timestamptz not null default now(),
  unique (id, organization_type)
);

create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id),
  user_id uuid not null references public.profiles(id),
  member_role text not null check (member_role in ('owner', 'manager', 'staff', 'viewer')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  advertiser_organization_id uuid not null,
  advertiser_organization_type text generated always as ('advertiser') stored,
  title text not null check (length(trim(title)) between 3 and 160),
  description text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'pending_review', 'scheduled', 'active', 'paused', 'ended', 'rejected')),
  starts_at timestamptz,
  ends_at timestamptz,
  points_per_verified_event integer not null check (points_per_verified_event between 1 and 100000),
  per_user_limit integer check (per_user_limit is null or per_user_limit > 0),
  total_event_limit integer check (total_event_limit is null or total_event_limit > 0),
  created_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  foreign key (advertiser_organization_id, advertiser_organization_type)
    references public.organizations(id, organization_type)
);

create table public.campaign_provider_configs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id),
  provider_code text not null check (length(trim(provider_code)) between 2 and 80),
  provider_campaign_ref text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (provider_code, provider_campaign_ref)
);

-- A row is inserted only after a trusted server adapter verifies authenticity,
-- freshness, campaign mapping, and replay protections.
create table public.verified_engagement_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id),
  user_id uuid not null references public.profiles(id),
  provider_code text not null,
  provider_event_id text not null,
  occurred_at timestamptz not null,
  verified_at timestamptz not null default now(),
  verification_method text not null,
  points_awarded integer not null check (points_awarded > 0),
  created_at timestamptz not null default now(),
  unique (provider_code, provider_event_id)
);

create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  entry_type text not null check (entry_type in ('earn', 'redeem', 'expire', 'adjustment', 'reversal')),
  points_delta integer not null check (points_delta <> 0),
  source_event_id uuid references public.verified_engagement_events(id),
  redemption_id uuid,
  reverses_entry_id uuid references public.points_ledger(id),
  idempotency_key text not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key),
  check (
    (entry_type = 'earn' and points_delta > 0 and source_event_id is not null)
    or (entry_type = 'redeem' and points_delta < 0 and redemption_id is not null)
    or (entry_type in ('expire', 'adjustment', 'reversal'))
  )
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  vendor_organization_id uuid not null,
  vendor_organization_type text generated always as ('vendor') stored,
  title text not null check (length(trim(title)) between 2 and 160),
  description text not null default '',
  points_cost integer not null check (points_cost > 0),
  status text not null default 'draft'
    check (status in ('draft', 'pending_review', 'published', 'paused', 'retired')),
  eligibility_text text not null default '',
  fulfilment_terms text not null default '',
  created_at timestamptz not null default now(),
  foreign key (vendor_organization_id, vendor_organization_type)
    references public.organizations(id, organization_type)
);

create table public.reward_inventory (
  reward_id uuid primary key references public.rewards(id),
  total_quantity integer not null check (total_quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  fulfilled_quantity integer not null default 0 check (fulfilled_quantity >= 0),
  updated_at timestamptz not null default now(),
  check (reserved_quantity + fulfilled_quantity <= total_quantity)
);

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  reward_id uuid not null references public.rewards(id),
  points_cost integer not null check (points_cost > 0),
  status text not null default 'reserved'
    check (status in ('reserved', 'accepted_by_vendor', 'fulfilled', 'cancelled', 'rejected', 'disputed', 'resolved')),
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

alter table public.points_ledger
  add constraint points_ledger_redemption_fk
  foreign key (redemption_id) references public.redemptions(id);

create table public.redemption_events (
  id uuid primary key default gen_random_uuid(),
  redemption_id uuid not null references public.redemptions(id),
  actor_user_id uuid references public.profiles(id),
  event_type text not null
    check (event_type in ('reserved', 'accepted_by_vendor', 'fulfilled', 'cancelled', 'rejected', 'disputed', 'resolved')),
  evidence_reference text,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id),
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index campaigns_status_schedule_idx on public.campaigns(status, starts_at, ends_at);
create index verified_events_user_campaign_idx on public.verified_engagement_events(user_id, campaign_id, occurred_at desc);
create index points_ledger_user_created_idx on public.points_ledger(user_id, created_at desc);
create index redemptions_vendor_status_idx on public.redemptions(reward_id, status, created_at desc);
create index redemption_events_redemption_created_idx on public.redemption_events(redemption_id, created_at);
create index audit_events_resource_created_idx on public.audit_events(resource_type, resource_id, created_at desc);

-- Ledger entries are immutable. Corrections must be compensating entries.
create function public.reject_points_ledger_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'points_ledger is append-only; insert a compensating entry';
end;
$$;

create trigger points_ledger_no_update
before update or delete on public.points_ledger
for each row execute function public.reject_points_ledger_mutation();

-- Enable RLS without adding permissive policies. Application access must go
-- through authenticated server routes / narrowly scoped database functions.
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_provider_configs enable row level security;
alter table public.verified_engagement_events enable row level security;
alter table public.points_ledger enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_inventory enable row level security;
alter table public.redemptions enable row level security;
alter table public.redemption_events enable row level security;
alter table public.audit_events enable row level security;

commit;
