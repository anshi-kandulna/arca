-- ============================================================
-- ARCA — Automated Regulatory Compliance Agent
-- Simplified Database DDL
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CORE TABLES
-- ============================================================

CREATE TABLE banks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  short_name      TEXT NOT NULL,
  rbi_license_no  TEXT UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE business_verticals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_id         UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bank_id, name)
);

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_id         UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  role            TEXT NOT NULL,
  business_vertical_id   UUID REFERENCES business_verticals(id) ON DELETE SET NULL,
  title           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CIRCULARS
-- ============================================================

CREATE TABLE circulars (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_id             UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
  ref_number          TEXT NOT NULL,
  title               TEXT NOT NULL,
  category            TEXT,
  file_path           TEXT,
  published_date      DATE NOT NULL,
  status              TEXT NOT NULL DEFAULT 'detected',
  priority            TEXT NOT NULL DEFAULT 'MEDIUM',
  total_pages         INTEGER,
  failed_pages        JSONB,
  failed_page_count   INTEGER,
  page_summary        JSONB,
  vertical_summary  JSONB,
  sub_vertical_summary JSONB,
  priority_summary    JSONB,
  total_obligations   INTEGER NOT NULL DEFAULT 0,
  completed_obligations INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bank_id, ref_number)
);

-- ============================================================
-- MEASURABLE ACTION POINTS (MAPs)
-- ============================================================

CREATE TABLE maps (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circular_id           UUID NOT NULL REFERENCES circulars(id) ON DELETE CASCADE,
  bank_id               UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
  map_ref               TEXT NOT NULL,
  obligation_text       TEXT NOT NULL,
  business_vertical        TEXT,
  sub_vertical          TEXT,
  routing_confidence    INTEGER,
  routing_reasoning     TEXT,
  deadline_raw          TEXT,
  deadline_resolved     TEXT,
  deadline_reasoning    TEXT,
  clause_ref            TEXT,
  page_no               INTEGER,
  matched_text          TEXT,
  bbox                  JSONB,
  priority              TEXT NOT NULL DEFAULT 'MEDIUM',
  status                TEXT NOT NULL DEFAULT 'draft',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bank_id, map_ref)
);

-- ============================================================
-- EVIDENCE & VALIDATION
-- ============================================================

CREATE TABLE evidence (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id          UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  submitted_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  file_name       TEXT,
  file_path       TEXT,
  notes           TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE validation_verdicts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evidence_id      UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  verdict          TEXT NOT NULL,
  confidence       INTEGER,
  reasoning        TEXT,
  missing_elements JSONB,
  signal_breakdown JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    bank_id UUID NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor VARCHAR NOT NULL,
    actor_role VARCHAR NOT NULL,
    action VARCHAR NOT NULL,
    action_type VARCHAR NOT NULL,
    circular_ref VARCHAR,
    map_ref VARCHAR,
    business_vertical VARCHAR,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('UTC'::text, now())
);

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_id         UUID NOT NULL REFERENCES banks(id) ON DELETE CASCADE,
  business_vertical VARCHAR,
  message         TEXT NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_circulars_bank_status ON circulars(bank_id, status);
CREATE INDEX idx_maps_circular ON maps(circular_id);
CREATE INDEX idx_maps_bank_status ON maps(bank_id, status);

-- ============================================================
-- TRIGGERS — auto-update circular obligation counts
-- ============================================================

CREATE OR REPLACE FUNCTION update_circular_obligation_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE circulars
  SET
    total_obligations = (
      SELECT COUNT(*) FROM maps
      WHERE circular_id = COALESCE(NEW.circular_id, OLD.circular_id)
    ),
    completed_obligations = (
      SELECT COUNT(*) FROM maps
      WHERE circular_id = COALESCE(NEW.circular_id, OLD.circular_id)
        AND status = 'closed'
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.circular_id, OLD.circular_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_maps_update_circular_counts
  AFTER INSERT OR UPDATE OF status OR DELETE ON maps
  FOR EACH ROW EXECUTE FUNCTION update_circular_obligation_counts();


-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO banks (id, name, short_name, rbi_license_no) VALUES ('1ab78645-3934-4893-a4b0-354149255c6e', 'Canara Bank', 'CB', 'RBI-1001');

INSERT INTO business_verticals (id, bank_id, name) VALUES ('b33b5492-0ed3-4fe3-aad0-ab3594f07b1f', '1ab78645-3934-4893-a4b0-354149255c6e', 'Digital Banking Services');
INSERT INTO business_verticals (id, bank_id, name) VALUES ('65691985-60bd-4131-b402-008126ce27a5', '1ab78645-3934-4893-a4b0-354149255c6e', 'Cybersecurity Wing');
INSERT INTO business_verticals (id, bank_id, name) VALUES ('c57b8b26-f28e-424e-8d93-528e22ded036', '1ab78645-3934-4893-a4b0-354149255c6e', 'IT Vertical');
INSERT INTO business_verticals (id, bank_id, name) VALUES ('f41539d5-4c9d-4b76-a031-05d3f0903f16', '1ab78645-3934-4893-a4b0-354149255c6e', 'Procurement & Vendor Management');
INSERT INTO business_verticals (id, bank_id, name) VALUES ('c2b881f3-7f52-4de8-98df-ad4e32651db8', '1ab78645-3934-4893-a4b0-354149255c6e', 'Credit Card Vertical');
INSERT INTO business_verticals (id, bank_id, name) VALUES ('22664200-0619-4dff-bb7e-afb43f9879c2', '1ab78645-3934-4893-a4b0-354149255c6e', 'Payments Vertical');
INSERT INTO business_verticals (id, bank_id, name) VALUES ('f0d418b9-c87e-4b9e-8f9d-c3417fa88c04', '1ab78645-3934-4893-a4b0-354149255c6e', 'Compliance Department');
INSERT INTO business_verticals (id, bank_id, name) VALUES ('911d58df-08c4-4537-8d05-058f687617ce', '1ab78645-3934-4893-a4b0-354149255c6e', 'Legal Department');
INSERT INTO business_verticals (id, bank_id, name) VALUES ('3f099286-1a84-4ab1-8460-1a52ceb2951a', '1ab78645-3934-4893-a4b0-354149255c6e', 'Risk Management');
INSERT INTO business_verticals (id, bank_id, name) VALUES ('38c7a93e-8ff0-48a5-9ff0-7e6a52637492', '1ab78645-3934-4893-a4b0-354149255c6e', 'Internal Audit');

INSERT INTO users (id, bank_id, email, full_name, role, business_vertical_id, title) VALUES ('d2351460-cba2-496f-a8f7-cb3ae2f3b6bb', '1ab78645-3934-4893-a4b0-354149255c6e', 'admin@suraksha.com', 'System Admin', 'system_admin', NULL, 'System Admin');
INSERT INTO users (id, bank_id, email, full_name, role, business_vertical_id, title) VALUES ('111b6496-aa1c-4265-969d-929fc8c1cadb', '1ab78645-3934-4893-a4b0-354149255c6e', 'officer@suraksha.com', 'Ananya Sharma', 'compliance_officer', NULL, 'Compliance Officer');
INSERT INTO users (id, bank_id, email, full_name, role, business_vertical_id, title) VALUES ('4d24c865-2ac5-43b7-9386-3191ddb1fcf5', '1ab78645-3934-4893-a4b0-354149255c6e', 'user1@suraksha.com', 'Test User 1', 'department_user', 'b33b5492-0ed3-4fe3-aad0-ab3594f07b1f', 'Digital Banking Services User');
INSERT INTO users (id, bank_id, email, full_name, role, business_vertical_id, title) VALUES ('a21bb0b8-a582-47cd-ada1-0fbd65c382da', '1ab78645-3934-4893-a4b0-354149255c6e', 'user2@suraksha.com', 'Test User 2', 'department_user', '65691985-60bd-4131-b402-008126ce27a5', 'Cybersecurity Wing User');



