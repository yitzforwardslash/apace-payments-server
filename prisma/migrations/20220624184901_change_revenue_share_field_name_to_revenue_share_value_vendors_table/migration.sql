/*
  Warnings:

  - You are about to drop the column `revenueShare` on the `Vendor` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "revenueShare",
ADD COLUMN     "revenueShareValue" DECIMAL(10,2);
