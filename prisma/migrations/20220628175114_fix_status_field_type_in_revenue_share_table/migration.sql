/*
  Warnings:

  - The `status` column on the `RevenueShare` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "RevenueShare" DROP COLUMN "status",
ADD COLUMN     "status" "RevenueShareStatus" NOT NULL DEFAULT E'available';
