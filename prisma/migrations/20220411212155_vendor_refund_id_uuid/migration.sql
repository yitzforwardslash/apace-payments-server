/*
  Warnings:

  - The primary key for the `Refund` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Vendor` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "Refund" DROP CONSTRAINT "Refund_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "RefundItem" DROP CONSTRAINT "RefundItem_refundId_fkey";

-- DropForeignKey
ALTER TABLE "RefundWebhookEvent" DROP CONSTRAINT "RefundWebhookEvent_refundId_fkey";

-- DropForeignKey
ALTER TABLE "WebhookEvent" DROP CONSTRAINT "WebhookEvent_refundId_fkey";

-- DropForeignKey
ALTER TABLE "WebhookSubscription" DROP CONSTRAINT "WebhookSubscription_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "_CustomerToVendor" DROP CONSTRAINT "_CustomerToVendor_B_fkey";

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "vendorId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Refund" DROP CONSTRAINT "Refund_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "vendorId" SET DATA TYPE TEXT,
ADD PRIMARY KEY ("id");
DROP SEQUENCE "Refund_id_seq";

-- AlterTable
ALTER TABLE "RefundItem" ALTER COLUMN "refundId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "RefundWebhookEvent" ALTER COLUMN "refundId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Vendor" DROP CONSTRAINT "Vendor_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD PRIMARY KEY ("id");
DROP SEQUENCE "Vendor_id_seq";

-- AlterTable
ALTER TABLE "WebhookEvent" ALTER COLUMN "refundId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "WebhookSubscription" ALTER COLUMN "vendorId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "_CustomerToVendor" ALTER COLUMN "B" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "Invoice" ADD FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundItem" ADD FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookSubscription" ADD FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundWebhookEvent" ADD FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomerToVendor" ADD FOREIGN KEY ("B") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
