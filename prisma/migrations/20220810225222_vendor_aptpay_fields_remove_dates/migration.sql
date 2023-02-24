/*
  Warnings:

  - You are about to drop the column `countryOfRegistration` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `provinceOfRegistration` on the `Vendor` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "countryOfRegistration",
DROP COLUMN "provinceOfRegistration";
