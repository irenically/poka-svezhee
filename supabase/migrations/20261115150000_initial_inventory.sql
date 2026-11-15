create table public.inventory_items (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 200),
  barcode text check (barcode is null or barcode ~ '^[0-9]{8,14}$'),
  quantity text not null default '1 шт.' check (char_length(quantity) <= 80),
  place text not null check (place in ('fridge', 'freezer')),
  date date,
  date_kind text not null default 'label' check (date_kind in ('label', 'estimate')),
  added_at timestamptz not null default now()
);
create index inventory_items_owner_date_idx on public.inventory_items (owner_id, date);

create table public.saved_barcodes (
  owner_id uuid not null references auth.users(id) on delete cascade,
  barcode text not null check (barcode ~ '^[0-9]{8,14}$'),
  name text not null check (char_length(trim(name)) between 1 and 200),
  primary key (owner_id, barcode)
);

alter table public.inventory_items enable row level security;
alter table public.saved_barcodes enable row level security;

grant select, insert, update, delete on public.inventory_items to authenticated;
grant select, insert, update, delete on public.saved_barcodes to authenticated;

create policy "owners read their inventory" on public.inventory_items
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owners add inventory" on public.inventory_items
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "owners change inventory" on public.inventory_items
  for update to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "owners remove inventory" on public.inventory_items
  for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "owners read saved barcodes" on public.saved_barcodes
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owners add saved barcodes" on public.saved_barcodes
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "owners change saved barcodes" on public.saved_barcodes
  for update to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "owners remove saved barcodes" on public.saved_barcodes
  for delete to authenticated using ((select auth.uid()) = owner_id);
