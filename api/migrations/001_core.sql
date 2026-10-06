CREATE TABLE projects (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE releases (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, version)
);

CREATE INDEX releases_published_order
  ON releases (project_id, published_at DESC, id DESC)
  WHERE status = 'published';

CREATE TABLE api_keys (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  prefix text NOT NULL UNIQUE,
  token_hash text NOT NULL UNIQUE,
  scope text NOT NULL CHECK (scope IN ('read', 'write')),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
