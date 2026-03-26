-- Migration 037: Comercial Weekly Reports
-- Weekly management summary that Vero writes and sends to Luz, Roger, Rafa
-- Applied via: npm run db:push (Drizzle reads from shared/schema/comercial.ts)

CREATE TABLE IF NOT EXISTS comercial_weekly_reports (
  id SERIAL PRIMARY KEY,
  week_start DATE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  recipients TEXT,
  created_by_id INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS comercial_weekly_reports_week_user_idx
  ON comercial_weekly_reports(week_start, created_by_id);
