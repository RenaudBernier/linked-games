-- Linked Games core schema (mirrors applied migration `initial_schema`)

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  username text not null unique,
  role text not null default 'participant'
);

create table public.competition_instances (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_by text not null references public.profiles (username) on delete restrict,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table public.challenge_templates (
  id uuid primary key default gen_random_uuid(),
  matrix jsonb not null
);

create table public.competition_instances_challenges_mapping (
  competition_instance_id uuid not null references public.competition_instances (id) on delete cascade,
  challenge_template_id uuid not null references public.challenge_templates (id) on delete cascade,
  primary key (competition_instance_id, challenge_template_id)
);

create table public.player_challenge_instances (
  id uuid primary key default gen_random_uuid(),
  challenge_template_id uuid not null references public.challenge_templates (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  is_completed boolean not null default false
);

create index idx_competition_instances_created_by on public.competition_instances (created_by);
create index idx_player_challenge_instances_user on public.player_challenge_instances (user_id);
create index idx_player_challenge_instances_challenge on public.player_challenge_instances (challenge_template_id);

alter table public.profiles enable row level security;
alter table public.competition_instances enable row level security;
alter table public.challenge_templates enable row level security;
alter table public.competition_instances_challenges_mapping enable row level security;
alter table public.player_challenge_instances enable row level security;

create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "competition_instances_select_authenticated"
  on public.competition_instances for select
  to authenticated
  using (true);

create policy "competition_instances_insert_as_self"
  on public.competition_instances for insert
  to authenticated
  with check (
    created_by = (select p.username from public.profiles p where p.user_id = auth.uid())
  );

create policy "competition_instances_update_creator"
  on public.competition_instances for update
  to authenticated
  using (
    created_by = (select p.username from public.profiles p where p.user_id = auth.uid())
  )
  with check (
    created_by = (select p.username from public.profiles p where p.user_id = auth.uid())
  );

create policy "challenge_templates_select_authenticated"
  on public.challenge_templates for select
  to authenticated
  using (true);

create policy "challenge_templates_insert_authenticated"
  on public.challenge_templates for insert
  to authenticated
  with check (true);

create policy "mapping_select_authenticated"
  on public.competition_instances_challenges_mapping for select
  to authenticated
  using (true);

create policy "mapping_insert_authenticated"
  on public.competition_instances_challenges_mapping for insert
  to authenticated
  with check (true);

create policy "mapping_delete_authenticated"
  on public.competition_instances_challenges_mapping for delete
  to authenticated
  using (true);

create policy "pci_select_own"
  on public.player_challenge_instances for select
  to authenticated
  using (user_id = auth.uid());

create policy "pci_insert_own"
  on public.player_challenge_instances for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "pci_update_own"
  on public.player_challenge_instances for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
