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

alter publication supabase_realtime add table conversation;
alter publication supabase_realtime add table user_memory;
alter publication supabase_realtime add table device_events;

alter table conversation disable row level security;
alter table user_memory disable row level security;
alter table device_events disable row level security;
