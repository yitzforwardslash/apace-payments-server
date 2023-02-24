/*
  Warnings:

  - Added the required column `type` to the `VendorPaymentMethod` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VendorPaymentMethod" ADD COLUMN     "type" "PaymentMethod" NOT NULL;
