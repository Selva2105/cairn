/*
  Warnings:

  - Changed the type of `type` on the `documents` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- AlterTable
ALTER TABLE "documents" DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM';

-- DropEnum
DROP TYPE "DocumentType";

-- CreateTable
CREATE TABLE "household_configs" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "currencySymbol" TEXT NOT NULL DEFAULT '₹',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "documentTypes" TEXT[] DEFAULT ARRAY['PASSPORT', 'NATIONAL_ID', 'DRIVERS_LICENSE', 'INSURANCE', 'VEHICLE_RC', 'WARRANTY', 'REGISTRATION', 'PROPERTY_LEASE', 'TAX_RETURN', 'MEDICAL', 'OTHER']::TEXT[],
    "billReminderDays" INTEGER[] DEFAULT ARRAY[7, 3, 1]::INTEGER[],
    "docReminderDays" INTEGER[] DEFAULT ARRAY[30, 14, 1]::INTEGER[],
    "digestTime" TEXT NOT NULL DEFAULT '08:00',
    "digestChannel" TEXT NOT NULL DEFAULT 'EMAIL',
    "defaultTaskPriority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "household_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "household_configs_householdId_key" ON "household_configs"("householdId");

-- CreateIndex
CREATE INDEX "documents_householdId_type_idx" ON "documents"("householdId", "type");

-- AddForeignKey
ALTER TABLE "household_configs" ADD CONSTRAINT "household_configs_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
