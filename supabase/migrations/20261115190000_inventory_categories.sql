alter table public.inventory_items
  add column category text not null default 'other'
  check (category in ('vegetables', 'fruit', 'dairy', 'meat', 'fish', 'bakery', 'pantry', 'drinks', 'ready', 'other'));
