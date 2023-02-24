/*
  Warnings:

  - You are about to drop the column `orderDate` on the `RefundItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "orderDate" TEXT;

-- AlterTable
ALTER TABLE "RefundItem" DROP COLUMN "orderDate";
