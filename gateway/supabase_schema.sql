-- Smart Room AI Gateway schema
-- Run this in Supabase SQL Editor.

create table if not exists conversation (
  id uuid default gen_random_uuid() primary key,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists user_memory (
  id uuid default gen_random_uuid() primary key,
  memory_text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists device_events (
  id uuid default gen_random_uuid() primary key,
  device text not null,
  action text not null,
  payload jsonb default '{}'::jsonb,
  source text default 'web' not null,
  message text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists commands (
  id uuid default gen_random_uuid() primary key,
  payload jsonb not null,
  source text default 'remote' not null,
  message text default '',
  executed boolean default false not null,
  executed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table commands add column if not exists source text default 'remote';
alter table commands add column if not exists message text default '';
alter table commands add column if not exists executed boolean default false not null;
alter table commands add column if not exists executed_at timestamp with time zone;

do $$
begin
  alter publication supabase_realtime add table conversation;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table user_memory;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table device_events;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table commands;
exception
  when duplicate_object then null;
end $$;

alter table conversation disable row level security;
alter table user_memory disable row level security;
alter table device_events disable row level security;
alter table commands disable row level security;

create table if not exists device_status (
  id text primary key,
  state jsonb default '{}'::jsonb,
  last_seen timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table device_status add column if not exists state jsonb default '{}'::jsonb;
do $$
begin
  alter publication supabase_realtime add table device_status;
exception
  when duplicate_object then null;
end $$;
alter table device_status disable row level security;
