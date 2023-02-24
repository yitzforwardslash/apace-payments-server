/*
  Warnings:

  - Added the required column `notes` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentMethod` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paymentMethod" TEXT;
