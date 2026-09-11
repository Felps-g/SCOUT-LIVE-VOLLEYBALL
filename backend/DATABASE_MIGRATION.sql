-- ============================================================
-- SCOUT DE VOLEI - MIGRACAO DO BANCO (Supabase / Postgres)
-- ============================================================
-- Idempotente: pode rodar quantas vezes quiser, em um banco vazio
-- ou em cima do banco atual do projeto, sem duplicar nada.
--
-- Cobre só as tabelas que o backend realmente usa. `teams` e
-- `players` não têm RLS habilitado de propósito: toda autorização
-- delas já é feita no código (o backend confere dono do time antes
-- de cada operação), e o backend sempre acessa o banco com a
-- SUPABASE_SERVICE_ROLE_KEY, nunca com o token do usuário.
-- ============================================================

-- ==========================
-- 1) TEAMS
-- ==========================
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id)
);

-- ==========================
-- 2) PLAYERS
-- ==========================
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  team_id UUID,
  cpf VARCHAR UNIQUE NOT NULL,
  jersey_number SMALLINT,
  height VARCHAR
);

-- Campos que a tela de "Adicionar atleta" já pedia (RG, idade, peso, foto)
-- mas que nunca foram salvos porque não existiam nem na tabela nem no
-- controller: o insert simplesmente ignorava tudo que não fosse
-- name/position/height/cpf/team_id/jersey_number. `ADD COLUMN IF NOT
-- EXISTS` é seguro rodar de novo mesmo se as colunas já existirem.
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS rg VARCHAR;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS age SMALLINT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS weight VARCHAR;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Garante que RLS está DESLIGADO em teams/players, do jeito que os
-- comentários acima sempre descreveram. `CREATE TABLE IF NOT EXISTS` não
-- faz nada se a tabela já existir — então se ela foi criada em algum
-- momento pelo Table Editor do Supabase (que liga RLS por padrão, sem
-- nenhuma policy), TODO insert/select ficava bloqueado silenciosamente e
-- nada no código conseguiria fazer o "criar time" funcionar. Rodar isso
-- de novo é seguro mesmo se já estiver desligado.
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.players DISABLE ROW LEVEL SECURITY;

-- ==========================
-- 3) MATCHES
-- ==========================
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_date DATE NOT NULL,
  home_team_id UUID NOT NULL REFERENCES public.teams(id),
  away_team_id UUID NOT NULL REFERENCES public.teams(id),
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID,
  location VARCHAR,
  final_result VARCHAR,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matches_user_id ON public.matches(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_home_team_id ON public.matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_team_id ON public.matches(away_team_id);

-- ==========================
-- 4) MATCH_SETS
-- ==========================
CREATE TABLE IF NOT EXISTS public.match_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id),
  set_number INTEGER NOT NULL,
  home_points INTEGER DEFAULT 0,
  away_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status VARCHAR DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  winner_team_id UUID
);

CREATE INDEX IF NOT EXISTS idx_match_sets_match_id ON public.match_sets(match_id);

-- ==========================
-- 5) SCOUT_ACTIONS
-- ==========================
CREATE TABLE IF NOT EXISTS public.scout_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id),
  set_id UUID NOT NULL REFERENCES public.match_sets(id),
  player_id UUID NOT NULL REFERENCES public.players(id),
  action_type VARCHAR NOT NULL,
  result VARCHAR NOT NULL,
  player_position VARCHAR,
  points_scored INTEGER DEFAULT 0,
  action_order INTEGER DEFAULT 0,
  action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scout_actions_match_id ON public.scout_actions(match_id);
CREATE INDEX IF NOT EXISTS idx_scout_actions_player_id ON public.scout_actions(player_id);
CREATE INDEX IF NOT EXISTS idx_scout_actions_set_id ON public.scout_actions(set_id);

-- ==========================
-- 6) PLAYER_MATCH_STATS
-- ==========================
CREATE TABLE IF NOT EXISTS public.player_match_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id),
  player_id UUID NOT NULL REFERENCES public.players(id),
  position VARCHAR,
  total_points INTEGER DEFAULT 0,
  attacks JSONB DEFAULT '{"total":0,"errors":0,"points":0,"effectiveness":0}',
  serves JSONB DEFAULT '{"total":0,"errors":0,"points":0,"effectiveness":0}',
  receptions JSONB DEFAULT '{"total":0,"errors":0,"points":0,"effectiveness":0,"a":0,"b":0,"c":0}',
  sets JSONB DEFAULT '{"total":0,"errors":0,"points":0,"effectiveness":0}',
  blocks JSONB DEFAULT '{"total":0,"errors":0,"points":0,"effectiveness":0}',
  defense JSONB DEFAULT '{"total":0,"errors":0,"points":0,"effectiveness":0}',
  errors JSONB DEFAULT '{"pass":0,"serve":0,"attack":0,"set":0,"block":0,"reception":0,"defense":0}',
  effectiveness NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_match_stats_match_id ON public.player_match_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_player_match_stats_player_id ON public.player_match_stats(player_id);

-- Exigido por matchOperations.upsertEstatistica (upsert com
-- onConflict: 'match_id,player_id'). Sem essa constraint, ações do mesmo
-- jogador salvas em paralelo pelo Scout Live podem criar linhas duplicadas
-- de estatística para o mesmo jogo.
ALTER TABLE public.player_match_stats
  DROP CONSTRAINT IF EXISTS player_match_stats_match_player_unique;
ALTER TABLE public.player_match_stats
  ADD CONSTRAINT player_match_stats_match_player_unique UNIQUE (match_id, player_id);

-- ==========================
-- 7) RLS - matches, match_sets, scout_actions, player_match_stats
-- ==========================
-- O backend sempre acessa essas tabelas com a service_role key (que
-- ignora RLS), mas deixamos as policies completas mesmo assim como
-- camada extra de proteção contra a anon key (ex: se ela vazar).
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_match_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS matches_select ON public.matches;
CREATE POLICY matches_select ON public.matches FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS matches_insert ON public.matches;
CREATE POLICY matches_insert ON public.matches FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS matches_update ON public.matches;
CREATE POLICY matches_update ON public.matches FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS matches_delete ON public.matches;
CREATE POLICY matches_delete ON public.matches FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS match_sets_select ON public.match_sets;
CREATE POLICY match_sets_select ON public.match_sets FOR SELECT
  USING (match_id IN (SELECT id FROM public.matches WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS match_sets_insert ON public.match_sets;
CREATE POLICY match_sets_insert ON public.match_sets FOR INSERT
  WITH CHECK (match_id IN (SELECT id FROM public.matches WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS match_sets_update ON public.match_sets;
CREATE POLICY match_sets_update ON public.match_sets FOR UPDATE
  USING (match_id IN (SELECT id FROM public.matches WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS match_sets_delete ON public.match_sets;
CREATE POLICY match_sets_delete ON public.match_sets FOR DELETE
  USING (match_id IN (SELECT id FROM public.matches WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS scout_actions_select ON public.scout_actions;
CREATE POLICY scout_actions_select ON public.scout_actions FOR SELECT
  USING (match_id IN (SELECT id FROM public.matches WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS scout_actions_insert ON public.scout_actions;
CREATE POLICY scout_actions_insert ON public.scout_actions FOR INSERT
  WITH CHECK (match_id IN (SELECT id FROM public.matches WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS scout_actions_delete ON public.scout_actions;
CREATE POLICY scout_actions_delete ON public.scout_actions FOR DELETE
  USING (match_id IN (SELECT id FROM public.matches WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS player_match_stats_select ON public.player_match_stats;
CREATE POLICY player_match_stats_select ON public.player_match_stats FOR SELECT
  USING (match_id IN (SELECT id FROM public.matches WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS player_match_stats_insert ON public.player_match_stats;
CREATE POLICY player_match_stats_insert ON public.player_match_stats FOR INSERT
  WITH CHECK (match_id IN (SELECT id FROM public.matches WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS player_match_stats_update ON public.player_match_stats;
CREATE POLICY player_match_stats_update ON public.player_match_stats FOR UPDATE
  USING (match_id IN (SELECT id FROM public.matches WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS player_match_stats_delete ON public.player_match_stats;
CREATE POLICY player_match_stats_delete ON public.player_match_stats FOR DELETE
  USING (match_id IN (SELECT id FROM public.matches WHERE user_id = auth.uid()));
-- ==========================
-- CATEGORIA DA EQUIPE
-- ==========================
-- Texto livre (não é uma tabela separada — ver justificativa na
-- documentação de regra de negócio). Nullable para não quebrar equipes
-- já cadastradas sem categoria.
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS category VARCHAR;

-- ==========================
-- COACH_PROFILES
-- ==========================
-- foto/telefone do técnico NÃO podem ir em auth.users.user_metadata: o
-- Supabase embute esse metadata inteiro dentro do JWT (access_token), e
-- uma foto em base64 ali faz o token estourar o limite de header do
-- Node/Express em toda requisição (431 Request Header Fields Too Large,
-- que o navegador mostra como se fosse erro de CORS). Por isso ficam
-- numa tabela separada, do mesmo jeito que players.photo_url.
CREATE TABLE IF NOT EXISTS public.coach_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  foto_url TEXT,
  telefone TEXT
);

ALTER TABLE public.coach_profiles DISABLE ROW LEVEL SECURITY;