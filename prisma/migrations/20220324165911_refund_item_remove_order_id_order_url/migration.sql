/*
  Warnings:

  - You are about to drop the column `orderId` on the `RefundItem` table. All the data in the column will be lost.
  - You are about to drop the column `orderUrl` on the `RefundItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RefundItem" DROP COLUMN "orderId",
DROP COLUMN "orderUrl";
