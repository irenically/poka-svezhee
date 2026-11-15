alter table public.inventory_items
  drop constraint inventory_items_place_check;

alter table public.inventory_items
  add constraint inventory_items_place_check
  check (place in ('fridge', 'freezer', 'medicine'));

alter table public.inventory_items
  drop constraint inventory_items_category_check;

alter table public.inventory_items
  add constraint inventory_items_category_check
  check (category in ('vegetables', 'fruit', 'dairy', 'meat', 'fish', 'bakery', 'sauces', 'preserves', 'pantry', 'drinks', 'ready', 'medicine', 'other'));
