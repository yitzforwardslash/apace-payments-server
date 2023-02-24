/*
  Warnings:

  - The `oldValues` column on the `Log` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `newValues` column on the `Log` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `updatedFields` column on the `Log` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Log" DROP COLUMN "oldValues",
ADD COLUMN     "oldValues" JSONB,
DROP COLUMN "newValues",
ADD COLUMN     "newValues" JSONB,
DROP COLUMN "updatedFields",
ADD COLUMN     "updatedFields" TEXT[];
