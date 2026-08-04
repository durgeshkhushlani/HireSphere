-- CreateEnum
CREATE TYPE "student_field_type" AS ENUM ('TEXT', 'NUMBER', 'DROPDOWN', 'DATE');

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "address" TEXT,
ADD COLUMN     "blood_group" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "tenth_percentage" DECIMAL(5,2),
ADD COLUMN     "twelfth_percentage" DECIMAL(5,2),
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "student_custom_field_definitions" (
    "id" TEXT NOT NULL,
    "university_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "field_type" "student_field_type" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_custom_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_custom_field_values" (
    "id" TEXT NOT NULL,
    "student_profile_id" TEXT NOT NULL,
    "field_definition_id" TEXT NOT NULL,
    "value" TEXT,

    CONSTRAINT "student_custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_custom_field_values_student_profile_id_field_defini_key" ON "student_custom_field_values"("student_profile_id", "field_definition_id");

-- AddForeignKey
ALTER TABLE "student_custom_field_definitions" ADD CONSTRAINT "student_custom_field_definitions_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_custom_field_values" ADD CONSTRAINT "student_custom_field_values_student_profile_id_fkey" FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_custom_field_values" ADD CONSTRAINT "student_custom_field_values_field_definition_id_fkey" FOREIGN KEY ("field_definition_id") REFERENCES "student_custom_field_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
