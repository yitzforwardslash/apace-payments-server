/*
  Warnings:

  - You are about to drop the column `TotalRevenueShareAmount` on the `Vendor` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "TotalRevenueShareAmount",
ADD COLUMN     "totalRevenueShareAmount" DECIMAL(10,2) DEFAULT 0;
