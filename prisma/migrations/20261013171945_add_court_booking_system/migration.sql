-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "court_bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "court_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "start_time" TIMESTAMPTZ NOT NULL,
    "end_time" TIMESTAMPTZ NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "cancelled_at" TIMESTAMPTZ,
    "cancelled_by_user_id" UUID,
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "court_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "court_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "court_id" UUID,
    "sport_id" UUID,
    "day_of_week" INTEGER NOT NULL,
    "open_time" TEXT NOT NULL,
    "close_time" TEXT NOT NULL,
    "slot_minutes" INTEGER NOT NULL DEFAULT 60,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "court_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "court_closures" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "court_id" UUID,
    "sport_id" UUID,
    "reason" TEXT NOT NULL,
    "start_time" TIMESTAMPTZ NOT NULL,
    "end_time" TIMESTAMPTZ NOT NULL,
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "court_closures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "court_bookings_court_id_start_time_end_time_idx" ON "court_bookings"("court_id", "start_time", "end_time");

-- CreateIndex
CREATE INDEX "court_bookings_user_id_start_time_idx" ON "court_bookings"("user_id", "start_time");

-- CreateIndex
CREATE INDEX "court_bookings_status_idx" ON "court_bookings"("status");

-- CreateIndex
CREATE INDEX "court_schedules_court_id_day_of_week_idx" ON "court_schedules"("court_id", "day_of_week");

-- CreateIndex
CREATE INDEX "court_schedules_sport_id_day_of_week_idx" ON "court_schedules"("sport_id", "day_of_week");

-- CreateIndex
CREATE INDEX "court_closures_court_id_start_time_end_time_idx" ON "court_closures"("court_id", "start_time", "end_time");

-- CreateIndex
CREATE INDEX "court_closures_sport_id_start_time_end_time_idx" ON "court_closures"("sport_id", "start_time", "end_time");

-- AddForeignKey
ALTER TABLE "court_bookings" ADD CONSTRAINT "court_bookings_court_id_fkey" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_bookings" ADD CONSTRAINT "court_bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_bookings" ADD CONSTRAINT "court_bookings_cancelled_by_user_id_fkey" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_schedules" ADD CONSTRAINT "court_schedules_court_id_fkey" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_schedules" ADD CONSTRAINT "court_schedules_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_closures" ADD CONSTRAINT "court_closures_court_id_fkey" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_closures" ADD CONSTRAINT "court_closures_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_closures" ADD CONSTRAINT "court_closures_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PostgreSQL Extension for temporal exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Prevent overlapping bookings on the same court for active (CONFIRMED) bookings [start_time, end_time)
ALTER TABLE "court_bookings" ADD CONSTRAINT "no_overlapping_court_bookings"
EXCLUDE USING gist (
    "court_id" WITH =,
    tstzrange("start_time", "end_time", '[)') WITH &&
)
WHERE ("status" = 'CONFIRMED');

-- Prevent a user from having overlapping bookings across courts
ALTER TABLE "court_bookings" ADD CONSTRAINT "no_overlapping_user_bookings"
EXCLUDE USING gist (
    "user_id" WITH =,
    tstzrange("start_time", "end_time", '[)') WITH &&
)
WHERE ("status" = 'CONFIRMED');
