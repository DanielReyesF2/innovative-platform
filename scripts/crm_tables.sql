-- Create new enums for CRM
DO $$ BEGIN
    CREATE TYPE "activity_type" AS ENUM('llamada', 'email', 'reunion', 'nota', 'cambio_etapa', 'documento', 'propuesta', 'otro');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "meeting_status" AS ENUM('programada', 'completada', 'cancelada', 'reprogramada');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "proposal_status" AS ENUM('borrador', 'enviada', 'revisada', 'aceptada', 'rechazada');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "alert_status" AS ENUM('pending', 'acknowledged', 'dismissed', 'auto_resolved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "alert_type" AS ENUM('overdue_follow_up', 'stale_prospect', 'high_value_at_risk', 'scheduled_reminder');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create prospect_activities table
CREATE TABLE IF NOT EXISTS "prospect_activities" (
    "id" serial PRIMARY KEY NOT NULL,
    "prospect_id" integer NOT NULL REFERENCES "prospects"("id"),
    "type" "activity_type" NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "metadata" jsonb,
    "created_by_id" integer NOT NULL REFERENCES "users"("id"),
    "created_at" timestamp DEFAULT now()
);

-- Create prospect_notes table
CREATE TABLE IF NOT EXISTS "prospect_notes" (
    "id" serial PRIMARY KEY NOT NULL,
    "prospect_id" integer NOT NULL REFERENCES "prospects"("id"),
    "content" text NOT NULL,
    "is_pinned" boolean DEFAULT false,
    "created_by_id" integer NOT NULL REFERENCES "users"("id"),
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- Create prospect_meetings table
CREATE TABLE IF NOT EXISTS "prospect_meetings" (
    "id" serial PRIMARY KEY NOT NULL,
    "prospect_id" integer NOT NULL REFERENCES "prospects"("id"),
    "title" text NOT NULL,
    "description" text,
    "scheduled_at" timestamp NOT NULL,
    "duration" integer DEFAULT 60,
    "location" text,
    "meeting_url" text,
    "status" "meeting_status" DEFAULT 'programada',
    "attendees" jsonb,
    "outcome" text,
    "completed_at" timestamp,
    "created_by_id" integer NOT NULL REFERENCES "users"("id"),
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- Create prospect_documents table
CREATE TABLE IF NOT EXISTS "prospect_documents" (
    "id" serial PRIMARY KEY NOT NULL,
    "prospect_id" integer NOT NULL REFERENCES "prospects"("id"),
    "name" text NOT NULL,
    "type" text NOT NULL,
    "url" text NOT NULL,
    "file_size" integer,
    "mime_type" text,
    "description" text,
    "uploaded_by_id" integer NOT NULL REFERENCES "users"("id"),
    "created_at" timestamp DEFAULT now()
);

-- Create proposal_versions table
CREATE TABLE IF NOT EXISTS "proposal_versions" (
    "id" serial PRIMARY KEY NOT NULL,
    "prospect_id" integer NOT NULL REFERENCES "prospects"("id"),
    "version" integer NOT NULL DEFAULT 1,
    "name" text NOT NULL,
    "url" text NOT NULL,
    "amount" numeric(14, 2),
    "valid_until" timestamp,
    "status" "proposal_status" DEFAULT 'borrador',
    "notes" text,
    "sent_at" timestamp,
    "sent_by_id" integer REFERENCES "users"("id"),
    "created_by_id" integer NOT NULL REFERENCES "users"("id"),
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- Create follow_up_alerts table
CREATE TABLE IF NOT EXISTS "follow_up_alerts" (
    "id" serial PRIMARY KEY NOT NULL,
    "prospect_id" integer REFERENCES "prospects"("id"),
    "alert_type" "alert_type" NOT NULL,
    "status" "alert_status" DEFAULT 'pending',
    "title" text NOT NULL,
    "message" text,
    "priority" "priority_level" DEFAULT 'media',
    "due_date" timestamp,
    "acknowledged_at" timestamp,
    "acknowledged_by_id" integer REFERENCES "users"("id"),
    "assigned_to_id" integer REFERENCES "users"("id"),
    "created_at" timestamp DEFAULT now()
);

-- Add new columns to prospects if they don't exist
DO $$ BEGIN
    ALTER TABLE "prospects" ADD COLUMN IF NOT EXISTS "last_contact_at" timestamp;
    ALTER TABLE "prospects" ADD COLUMN IF NOT EXISTS "next_follow_up_at" timestamp;
    ALTER TABLE "prospects" ADD COLUMN IF NOT EXISTS "competitors" text[];
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_activities_prospect" ON "prospect_activities"("prospect_id");
CREATE INDEX IF NOT EXISTS "idx_notes_prospect" ON "prospect_notes"("prospect_id");
CREATE INDEX IF NOT EXISTS "idx_meetings_prospect" ON "prospect_meetings"("prospect_id");
CREATE INDEX IF NOT EXISTS "idx_meetings_scheduled" ON "prospect_meetings"("scheduled_at");
CREATE INDEX IF NOT EXISTS "idx_documents_prospect" ON "prospect_documents"("prospect_id");
CREATE INDEX IF NOT EXISTS "idx_proposals_prospect" ON "proposal_versions"("prospect_id");
CREATE INDEX IF NOT EXISTS "idx_alerts_status" ON "follow_up_alerts"("status");
CREATE INDEX IF NOT EXISTS "idx_alerts_assigned" ON "follow_up_alerts"("assigned_to_id");
