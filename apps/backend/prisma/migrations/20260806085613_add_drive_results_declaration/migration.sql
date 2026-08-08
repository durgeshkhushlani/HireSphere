-- AlterTable
ALTER TABLE "drives" ADD COLUMN     "results_declared" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "results_declared_at" TIMESTAMP(3);
