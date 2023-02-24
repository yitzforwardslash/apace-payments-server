/*
  Warnings:

  - You are about to drop the column `updatedBy` on the `Log` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Log" DROP COLUMN "updatedBy",
ADD COLUMN     "updatedById" INTEGER;

-- AddForeignKey
ALTER TABLE "Log" ADD FOREIGN KEY ("updatedById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
