/*
  Warnings:

  - You are about to drop the column `expirationMonth` on the `Refund` table. All the data in the column will be lost.
  - You are about to drop the column `expirationYear` on the `Refund` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Refund" DROP COLUMN "expirationMonth",
DROP COLUMN "expirationYear";
