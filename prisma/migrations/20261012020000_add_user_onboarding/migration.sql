-- AlterTable
ALTER TABLE "users" ADD COLUMN "address" TEXT;
ALTER TABLE "users" ADD COLUMN "is_onboarded" BOOLEAN NOT NULL DEFAULT false;
