-- AlterTable
ALTER TABLE "drives" ADD COLUMN     "auto_close_at" TIMESTAMP(3),
ADD COLUMN     "opened_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "resume_url" TEXT;
