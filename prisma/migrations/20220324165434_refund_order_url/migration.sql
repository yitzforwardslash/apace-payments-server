/*
  Warnings:

  - You are about to drop the column `orderIds` on the `Refund` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Refund" DROP COLUMN "orderIds",
ADD COLUMN     "orderUrl" TEXT;
