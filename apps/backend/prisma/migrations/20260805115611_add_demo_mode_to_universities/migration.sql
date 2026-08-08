-- AlterTable
ALTER TABLE "universities" ADD COLUMN     "demo_expires_at" TIMESTAMP(3),
ADD COLUMN     "is_demo" BOOLEAN NOT NULL DEFAULT false;
