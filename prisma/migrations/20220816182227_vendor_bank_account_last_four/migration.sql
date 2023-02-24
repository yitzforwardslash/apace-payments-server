/*
  Warnings:

  - Added the required column `accountNumberLastFour` to the `VendorBankAccount` table without a default value. This is not possible if the table is not empty.
  - Added the required column `routingNumberLastFour` to the `VendorBankAccount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VendorBankAccount" ADD COLUMN     "accountNumberLastFour" TEXT NOT NULL,
ADD COLUMN     "routingNumberLastFour" TEXT NOT NULL;
