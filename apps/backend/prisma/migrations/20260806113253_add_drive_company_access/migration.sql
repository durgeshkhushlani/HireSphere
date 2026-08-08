-- CreateTable
CREATE TABLE "drive_company_access" (
    "id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "access_code" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drive_company_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drive_company_access_drive_id_key" ON "drive_company_access"("drive_id");

-- CreateIndex
CREATE UNIQUE INDEX "drive_company_access_access_code_key" ON "drive_company_access"("access_code");

-- AddForeignKey
ALTER TABLE "drive_company_access" ADD CONSTRAINT "drive_company_access_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "drives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
