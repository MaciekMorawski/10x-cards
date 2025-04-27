-- Migration: Initial schema setup for 10xCards
-- Description: Creates all required tables, indexes, RLS policies, and triggers
-- Tables: generations, flashcards, generation_error_logs
-- Note: users table is managed by Supabase Auth

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- Create generations table first (as flashcards depends on it)
create table generations (
    id bigserial primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    model varchar not null,
    generated_count integer not null,
    accepted_unedited_count integer,
    accepted_edited_count integer,
    source_text_hash varchar not null,
    source_text_length integer not null check (source_text_length between 1000 and 10000),
    generation_duration integer not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Create flashcards table (depends on generations)
create table flashcards (
    id bigserial primary key,
    front varchar(200) not null,
    back varchar(500) not null,
    source varchar not null check (source in ('ai-full', 'ai-edited', 'manual')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    generation_id bigint,
    user_id uuid not null references auth.users(id) on delete cascade
);

-- Create generation_error_logs table
create table generation_error_logs (
    id bigserial primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    model varchar not null,
    source_text_hash varchar not null,
    source_text_length integer not null check (source_text_length between 1000 and 10000),
    error_code varchar(100) not null,
    error_message text not null,
    created_at timestamptz not null default now()
);

-- Create indexes
create index generations_user_id_idx on generations(user_id);
create index flashcards_user_id_idx on flashcards(user_id);
create index flashcards_generation_id_idx on flashcards(generation_id);
create index generation_error_logs_user_id_idx on generation_error_logs(user_id);

-- Create updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create trigger for flashcards and generations
create trigger update_flashcards_updated_at
    before update on flashcards
    for each row
    execute function update_updated_at_column();

create trigger update_generations_updated_at
    before update on generations
    for each row
    execute function update_updated_at_column();

-- Enable Row Level Security
alter table generations enable row level security;
alter table flashcards enable row level security;
alter table generation_error_logs enable row level security;

-- Create RLS Policies for generations
create policy "Users can view their own generations"
    on generations for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can insert their own generations"
    on generations for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy "Users can update their own generations"
    on generations for update
    to authenticated
    using (auth.uid() = user_id);

-- Create RLS Policies for flashcards
create policy "Users can view their own flashcards"
    on flashcards for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can insert their own flashcards"
    on flashcards for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy "Users can update their own flashcards"
    on flashcards for update
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can delete their own flashcards"
    on flashcards for delete
    to authenticated
    using (auth.uid() = user_id);

-- Create RLS Policies for generation_error_logs
create policy "Users can view their own error logs"
    on generation_error_logs for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can insert their own error logs"
    on generation_error_logs for insert
    to authenticated
    with check (auth.uid() = user_id);

-- Add foreign key constraint for flashcards.generation_id
alter table flashcards
add constraint flashcards_generation_id_fkey
foreign key (generation_id)
references generations(id)
on delete set null;