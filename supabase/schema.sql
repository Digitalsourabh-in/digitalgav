-- Digital Gav Supabase schema. Run in Supabase SQL Editor.
-- Creates village records, role profiles, page content and audit logs.

create extension if not exists pgcrypto;

create table if not exists public.villages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  district text,
  taluka text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'viewer'
    check (role in ('super_admin', 'village_admin', 'sub_admin', 'viewer')),
  village_id uuid references public.villages(id) on delete set null,
  can_publish boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.village_pages (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null unique references public.villages(id) on delete cascade,
  content jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  village_id uuid references public.villages(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists profiles_village_id_idx
  on public.profiles(village_id);
create index if not exists audit_logs_village_created_idx
  on public.audit_logs(village_id, created_at desc);

alter table public.villages enable row level security;
alter table public.profiles enable row level security;
alter table public.village_pages enable row level security;
alter table public.audit_logs enable row level security;

-- Helper functions read the signed-in user's own profile safely.
create or replace function public.current_user_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_user_village()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select village_id from public.profiles where id = auth.uid()
$$;

create or replace function public.can_manage_village(target_village uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select
    public.current_user_role() = 'super_admin'
    or (
      public.current_user_role() in ('village_admin', 'sub_admin')
      and public.current_user_village() = target_village
    )
$$;

-- Publishing is a separate permission. Sub-admins cannot publish by default.
-- A village admin/sub-admin can publish only when can_publish is explicitly true.
create or replace function public.can_publish_village(target_village uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select
    public.current_user_role() = 'super_admin'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.village_id = target_village
        and p.role in ('village_admin', 'sub_admin')
        and p.can_publish = true
    )
$$;

drop policy if exists "Public read published villages" on public.villages;
create policy "Public read published villages"
  on public.villages for select
  using (status = 'published');

drop policy if exists "Super admin manages villages" on public.villages;
create policy "Super admin manages villages"
  on public.villages for all to authenticated
  using (public.current_user_role() = 'super_admin')
  with check (public.current_user_role() = 'super_admin');

drop policy if exists "Read own or managed profiles" on public.profiles;
create policy "Read own or managed profiles"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.current_user_role() = 'super_admin'
    or (
      public.current_user_role() = 'village_admin'
      and village_id = public.current_user_village()
    )
  );

drop policy if exists "Super admin manages profiles" on public.profiles;
create policy "Super admin manages profiles"
  on public.profiles for all to authenticated
  using (public.current_user_role() = 'super_admin')
  with check (public.current_user_role() = 'super_admin');

-- New sign-ups receive the lowest-privilege role until an admin assigns access.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'viewer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop policy if exists "Public read published pages" on public.village_pages;
create policy "Public read published pages"
  on public.village_pages for select
  using (
    is_published = true
    and exists (
      select 1 from public.villages v
      where v.id = village_id and v.status = 'published'
    )
  );

drop policy if exists "Assigned admins read pages" on public.village_pages;
create policy "Assigned admins read pages"
  on public.village_pages for select to authenticated
  using (public.can_manage_village(village_id));

drop policy if exists "Assigned admins insert draft pages" on public.village_pages;
create policy "Assigned admins insert draft pages"
  on public.village_pages for insert to authenticated
  with check (
    public.can_manage_village(village_id)
    and is_published = false
  );

drop policy if exists "Assigned admins update pages" on public.village_pages;
create policy "Assigned admins update pages"
  on public.village_pages for update to authenticated
  using (public.can_manage_village(village_id))
  with check (
    public.can_manage_village(village_id)
    and (
      is_published = false
      or public.can_publish_village(village_id)
    )
  );

drop policy if exists "Admins read audit logs" on public.audit_logs;
create policy "Admins read audit logs"
  on public.audit_logs for select to authenticated
  using (
    public.current_user_role() = 'super_admin'
    or (
      public.current_user_role() = 'village_admin'
      and village_id = public.current_user_village()
    )
  );

drop policy if exists "Admins insert audit logs" on public.audit_logs;
create policy "Admins insert audit logs"
  on public.audit_logs for insert to authenticated
  with check (
    actor_id = auth.uid()
    and public.can_manage_village(village_id)
  );

-- After creating your own account in Supabase Auth, copy its user UUID
-- and run this separately, replacing the placeholder with your real UUID:
-- update public.profiles
-- set role = 'super_admin', village_id = null, can_publish = true
-- where id = 'YOUR_AUTH_USER_UUID';


-- Village admins can upload, replace and delete only files inside their own village folder.
-- The first folder in each object path must match the assigned village slug.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('digitalgav-village-images', 'digitalgav-village-images', true, 20971520,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = true,
    file_size_limit = 20971520,
    allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Village admins read own village images" on storage.objects;
create policy "Village admins read own village images"
on storage.objects for select to authenticated
using (
  bucket_id = 'digitalgav-village-images'
  and exists (
    select 1 from public.villages v
    where v.slug = (storage.foldername(name))[1]
      and public.can_manage_village(v.id)
  )
);

drop policy if exists "Village admins upload own village images" on storage.objects;
create policy "Village admins upload own village images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'digitalgav-village-images'
  and exists (
    select 1 from public.villages v
    where v.slug = (storage.foldername(name))[1]
      and public.can_manage_village(v.id)
  )
);

drop policy if exists "Village admins update own village images" on storage.objects;
create policy "Village admins update own village images"
on storage.objects for update to authenticated
using (
  bucket_id = 'digitalgav-village-images'
  and exists (
    select 1 from public.villages v
    where v.slug = (storage.foldername(name))[1]
      and public.can_manage_village(v.id)
  )
)
with check (
  bucket_id = 'digitalgav-village-images'
  and exists (
    select 1 from public.villages v
    where v.slug = (storage.foldername(name))[1]
      and public.can_manage_village(v.id)
  )
);

drop policy if exists "Village admins delete own village images" on storage.objects;
create policy "Village admins delete own village images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'digitalgav-village-images'
  and exists (
    select 1 from public.villages v
    where v.slug = (storage.foldername(name))[1]
      and public.can_manage_village(v.id)
  )
);
