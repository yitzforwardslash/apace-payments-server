/*
  Warnings:

  - You are about to drop the column `fundingSources` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `removedFundingSources` on the `Vendor` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "fundingSources",
DROP COLUMN "removedFundingSources";
