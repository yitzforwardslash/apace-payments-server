/*
  Warnings:

  - You are about to drop the `VendorPaymentMethod` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "VendorPaymentMethod" DROP CONSTRAINT "VendorPaymentMethod_vendorId_fkey";

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "fundingSources" TEXT[];

-- DropTable
DROP TABLE "VendorPaymentMethod";
