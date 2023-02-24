/*
  Warnings:

  - You are about to drop the column `revenueShareValue` on the `Vendor` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "revenueShareValue",
ADD COLUMN     "revenueSharePercentage" DECIMAL(10,2);
