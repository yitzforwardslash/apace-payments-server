/*
  Warnings:

  - You are about to drop the column `stripeToken` on the `VendorCard` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "VendorCard" DROP COLUMN "stripeToken",
ADD COLUMN     "stripeId" TEXT;
