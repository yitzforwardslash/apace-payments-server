/*
  Warnings:

  - The `productId` column on the `Refund` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Refund" DROP COLUMN "productId",
ADD COLUMN     "productId" TEXT[];
