/*
  Warnings:

  - You are about to drop the column `productId` on the `Refund` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Refund" DROP COLUMN "productId",
ADD COLUMN     "productIds" TEXT[];
