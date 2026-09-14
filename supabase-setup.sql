-- Run this once in Supabase Dashboard > SQL Editor.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price integer not null check (price >= 0),
  old_price integer,
  tag text,
  rating numeric default 4.5,
  reviews integer default 0,
  color text default '#DCE7DD',
  icon text default 'bag',
  image text,
  is_arrival boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.products add column if not exists is_arrival boolean not null default false;
update public.products set tag = 'New Arrivals', is_arrival = true where is_arrival = true;
update public.products set is_arrival = (tag = 'New Arrivals');

alter table public.products enable row level security;

drop policy if exists "Anyone can read products" on public.products;
create policy "Anyone can read products"
  on public.products for select
  using (true);

drop policy if exists "Anyone can add products for demo admin" on public.products;
create policy "Anyone can add products for demo admin"
  on public.products for insert
  with check (true);

drop policy if exists "Anyone can update products for demo admin" on public.products;
create policy "Anyone can update products for demo admin"
  on public.products for update
  using (true)
  with check (true);

drop policy if exists "Anyone can delete products for demo admin" on public.products;

create policy "Anyone can delete products for demo admin"
  on public.products for delete
  using (true);

do $$
begin
  alter publication supabase_realtime add table public.products;
exception
  when duplicate_object then null;
end $$;