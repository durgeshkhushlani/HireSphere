-- CreateEnum
CREATE TYPE "offer_type" AS ENUM ('INTERNSHIP', 'JOB');

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "selected_role_id" TEXT;

-- AlterTable
ALTER TABLE "placements" ADD COLUMN     "drive_role_id" TEXT;

-- CreateTable
CREATE TABLE "drive_roles" (
    "id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "offer_type" "offer_type" NOT NULL,
    "description" TEXT NOT NULL,
    "ctc_amount" DECIMAL(10,2),
    "stipend_amount" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drive_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_role_preferences" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "drive_role_id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "application_role_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "application_role_preferences_application_id_drive_role_id_key" ON "application_role_preferences"("application_id", "drive_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_role_preferences_application_id_rank_key" ON "application_role_preferences"("application_id", "rank");

-- AddForeignKey
ALTER TABLE "drive_roles" ADD CONSTRAINT "drive_roles_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "drives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_role_preferences" ADD CONSTRAINT "application_role_preferences_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_role_preferences" ADD CONSTRAINT "application_role_preferences_drive_role_id_fkey" FOREIGN KEY ("drive_role_id") REFERENCES "drive_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_selected_role_id_fkey" FOREIGN KEY ("selected_role_id") REFERENCES "drive_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placements" ADD CONSTRAINT "placements_drive_role_id_fkey" FOREIGN KEY ("drive_role_id") REFERENCES "drive_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
