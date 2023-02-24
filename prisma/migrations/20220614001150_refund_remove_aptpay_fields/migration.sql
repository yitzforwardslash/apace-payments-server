/*
  Warnings:

  - You are about to drop the column `aptpayErrorCode` on the `Refund` table. All the data in the column will be lost.
  - You are about to drop the column `aptpayErrorMessage` on the `Refund` table. All the data in the column will be lost.
  - You are about to drop the column `aptpayId` on the `Refund` table. All the data in the column will be lost.
  - You are about to drop the column `aptpayInfo` on the `Refund` table. All the data in the column will be lost.
  - You are about to drop the column `aptpayStatus` on the `Refund` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Refund" DROP COLUMN "aptpayErrorCode",
DROP COLUMN "aptpayErrorMessage",
DROP COLUMN "aptpayId",
DROP COLUMN "aptpayInfo",
DROP COLUMN "aptpayStatus";
