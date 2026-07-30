-- CreateEnum
CREATE TYPE "role" AS ENUM ('ADMIN', 'STUDENT');

-- CreateEnum
CREATE TYPE "drive_status" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "application_status" AS ENUM ('APPLIED', 'SHORTLISTED', 'OA_TEST', 'INTERVIEW', 'SELECTED', 'NOT_SELECTED');

-- CreateTable
CREATE TABLE "universities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "universities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "university_programs" (
    "id" TEXT NOT NULL,
    "university_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,

    CONSTRAINT "university_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "university_id" TEXT NOT NULL,
    "role" "role" NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "user_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "cgpa" DECIMAL(4,2) NOT NULL,
    "backlog_count" INTEGER NOT NULL DEFAULT 0,
    "placement_locked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drives" (
    "id" TEXT NOT NULL,
    "university_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "drive_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive_eligible_programs" (
    "id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "university_program_id" TEXT NOT NULL,

    CONSTRAINT "drive_eligible_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_forms" (
    "id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "student_profile_id" TEXT NOT NULL,
    "responses" JSONB NOT NULL,
    "resume_url" TEXT,
    "interview_slot" TIMESTAMP(3),
    "interview_venue" TEXT,
    "status" "application_status" NOT NULL DEFAULT 'APPLIED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placements" (
    "id" TEXT NOT NULL,
    "university_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "drive_id" TEXT,
    "package_amount" DECIMAL(10,2),
    "placed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "placements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "universities_domain_key" ON "universities"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "programs_name_key" ON "programs"("name");

-- CreateIndex
CREATE UNIQUE INDEX "university_programs_university_id_program_id_key" ON "university_programs"("university_id", "program_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "drive_eligible_programs_drive_id_university_program_id_key" ON "drive_eligible_programs"("drive_id", "university_program_id");

-- CreateIndex
CREATE UNIQUE INDEX "application_forms_drive_id_key" ON "application_forms"("drive_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_drive_id_student_profile_id_key" ON "applications"("drive_id", "student_profile_id");

-- AddForeignKey
ALTER TABLE "university_programs" ADD CONSTRAINT "university_programs_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_programs" ADD CONSTRAINT "university_programs_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drives" ADD CONSTRAINT "drives_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drives" ADD CONSTRAINT "drives_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_eligible_programs" ADD CONSTRAINT "drive_eligible_programs_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "drives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_eligible_programs" ADD CONSTRAINT "drive_eligible_programs_university_program_id_fkey" FOREIGN KEY ("university_program_id") REFERENCES "university_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_forms" ADD CONSTRAINT "application_forms_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "drives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "drives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_student_profile_id_fkey" FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placements" ADD CONSTRAINT "placements_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placements" ADD CONSTRAINT "placements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placements" ADD CONSTRAINT "placements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placements" ADD CONSTRAINT "placements_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "drives"("id") ON DELETE SET NULL ON UPDATE CASCADE;
