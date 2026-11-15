create table public.households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Наша семья' check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.household_invites (
  code uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz
);

create index household_invites_household_idx on public.household_invites (household_id);
create index household_members_user_idx on public.household_members (user_id);
alter table public.inventory_items add column household_id uuid references public.households(id) on delete cascade;
create index inventory_items_household_date_idx on public.inventory_items (household_id, date);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;

grant select on public.households, public.household_members to authenticated;
-- Invitation codes are returned only by the guarded RPCs below.
revoke all on public.household_invites from anon, authenticated;

create policy "members read their household" on public.households
  for select to authenticated using (
    id in (select household_id from public.household_members where user_id = (select auth.uid()))
  );
create policy "members read own membership" on public.household_members
  for select to authenticated using (user_id = (select auth.uid()));

drop policy "owners read their inventory" on public.inventory_items;
drop policy "owners add inventory" on public.inventory_items;
drop policy "owners change inventory" on public.inventory_items;
drop policy "owners remove inventory" on public.inventory_items;

create policy "members read inventory" on public.inventory_items
  for select to authenticated using (
    (household_id is null and owner_id = (select auth.uid())) or
    household_id in (select household_id from public.household_members where user_id = (select auth.uid()))
  );
create policy "members add inventory" on public.inventory_items
  for insert to authenticated with check (
    owner_id = (select auth.uid()) and (
      household_id is null or
      household_id in (select household_id from public.household_members where user_id = (select auth.uid()))
    )
  );
create policy "members change inventory" on public.inventory_items
  for update to authenticated using (
    (household_id is null and owner_id = (select auth.uid())) or
    household_id in (select household_id from public.household_members where user_id = (select auth.uid()))
  ) with check (
    (household_id is null and owner_id = (select auth.uid())) or
    household_id in (select household_id from public.household_members where user_id = (select auth.uid()))
  );
create policy "members remove inventory" on public.inventory_items
  for delete to authenticated using (
    (household_id is null and owner_id = (select auth.uid())) or
    household_id in (select household_id from public.household_members where user_id = (select auth.uid()))
  );

create function public.protect_inventory_scope() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' and
    (new.owner_id is distinct from old.owner_id or new.household_id is distinct from old.household_id) then
    raise exception 'Inventory ownership cannot be changed directly';
  end if;
  return new;
end;
$$;
create trigger protect_inventory_scope before update on public.inventory_items
  for each row execute function public.protect_inventory_scope();

create function public.create_household(p_name text default 'Наша семья') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_household uuid;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  if char_length(trim(p_name)) not between 1 and 80 then raise exception 'Invalid household name'; end if;
  if exists (select 1 from public.household_members where user_id = v_user) then
    raise exception 'Already in a household';
  end if;
  insert into public.households (owner_id, name) values (v_user, trim(p_name)) returning id into v_household;
  insert into public.household_members (household_id, user_id) values (v_household, v_user);
  update public.inventory_items set household_id = v_household where owner_id = v_user and household_id is null;
  return v_household;
end;
$$;

create function public.create_household_invite() returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_household uuid; v_code uuid;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  select id into v_household from public.households where owner_id = v_user;
  if v_household is null then raise exception 'Only the household owner can invite'; end if;
  insert into public.household_invites (household_id, created_by)
    values (v_household, v_user) returning code into v_code;
  return v_code;
end;
$$;

create function public.join_household(p_code uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_invite public.household_invites%rowtype;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  if exists (select 1 from public.household_members where user_id = v_user) then
    raise exception 'Already in a household';
  end if;
  select * into v_invite from public.household_invites where code = p_code for update;
  if not found or v_invite.used_at is not null or v_invite.expires_at <= now() then
    raise exception 'Invitation is invalid or expired';
  end if;
  insert into public.household_members (household_id, user_id) values (v_invite.household_id, v_user);
  update public.household_invites set used_at = now() where code = p_code;
  update public.inventory_items set household_id = v_invite.household_id
    where owner_id = v_user and household_id is null;
  return v_invite.household_id;
end;
$$;

revoke all on function public.create_household(text), public.create_household_invite(), public.join_household(uuid) from public, anon;
grant execute on function public.create_household(text), public.create_household_invite(), public.join_household(uuid) to authenticated;
