/*
  Warnings:

  - You are about to drop the column `Country` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `onboarded` on the `Vendor` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "Country",
DROP COLUMN "onboarded",
ADD COLUMN     "country" TEXT;
