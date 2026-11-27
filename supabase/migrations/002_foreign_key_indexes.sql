-- WheelofWinners foreign-key index completion.
-- Applied to the selected AD2EARN promotional games Supabase project
-- as migration wheelofwinners_foreign_key_indexes. Keep this file aligned.

begin;

create index if not exists audit_events_actor_user_idx on public.audit_events (actor_user_id);
create index if not exists campaign_provider_configs_campaign_idx on public.campaign_provider_configs (campaign_id);
create index if not exists campaigns_advertiser_org_idx on public.campaigns (advertiser_organization_id, advertiser_organization_type);
create index if not exists organization_memberships_user_idx on public.organization_memberships (user_id);
create index if not exists points_ledger_redemption_idx on public.points_ledger (redemption_id);
create index if not exists points_ledger_reverses_entry_idx on public.points_ledger (reverses_entry_id);
create index if not exists points_ledger_source_event_idx on public.points_ledger (source_event_id);
create index if not exists redemption_events_actor_user_idx on public.redemption_events (actor_user_id);
create index if not exists rewards_vendor_org_idx on public.rewards (vendor_organization_id, vendor_organization_type);
create index if not exists verified_events_campaign_idx on public.verified_engagement_events (campaign_id);

commit;
