/*
  Warnings:

  - You are about to drop the column `status` on the `RevenueShare` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RevenueShare" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "availableRevenueShareAmount" DECIMAL(10,2),
ADD COLUMN     "paidRevenueShareAmount" DECIMAL(10,2);

-- DropEnum
DROP TYPE "RevenueShareStatus";
