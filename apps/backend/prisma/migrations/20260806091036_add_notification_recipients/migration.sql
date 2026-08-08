-- CreateEnum
CREATE TYPE "notification_event" AS ENUM ('NEW_COMPANY', 'NEW_DRIVE', 'STUDENT_SELECTED');

-- CreateTable
CREATE TABLE "notification_recipients" (
    "id" TEXT NOT NULL,
    "university_id" TEXT NOT NULL,
    "event" "notification_event" NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_recipients_university_id_event_email_key" ON "notification_recipients"("university_id", "event", "email");

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
