-- DropForeignKey
ALTER TABLE "CustomerCard" DROP CONSTRAINT "CustomerCard_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "Payout" DROP CONSTRAINT "Payout_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "RefundItem" DROP CONSTRAINT "RefundItem_refundId_fkey";

-- DropForeignKey
ALTER TABLE "RefundWebhookEvent" DROP CONSTRAINT "RefundWebhookEvent_refundId_fkey";

-- DropForeignKey
ALTER TABLE "RevenueShare" DROP CONSTRAINT "RevenueShare_refundId_fkey";

-- DropForeignKey
ALTER TABLE "RevenueShare" DROP CONSTRAINT "RevenueShare_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "VendorBankAccount" DROP CONSTRAINT "VendorBankAccount_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "VendorCard" DROP CONSTRAINT "VendorCard_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "VendorPaymentMethod" DROP CONSTRAINT "VendorPaymentMethod_vendorBankAccountId_fkey";

-- DropForeignKey
ALTER TABLE "VendorPaymentMethod" DROP CONSTRAINT "VendorPaymentMethod_vendorCardId_fkey";

-- DropForeignKey
ALTER TABLE "VendorPaymentMethod" DROP CONSTRAINT "VendorPaymentMethod_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "WebhookEvent" DROP CONSTRAINT "WebhookEvent_refundId_fkey";

-- DropForeignKey
ALTER TABLE "WebhookEvent" DROP CONSTRAINT "WebhookEvent_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "WebhookSubscription" DROP CONSTRAINT "WebhookSubscription_vendorId_fkey";

-- AddForeignKey
ALTER TABLE "CustomerCard" ADD FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPaymentMethod" ADD FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPaymentMethod" ADD FOREIGN KEY ("vendorCardId") REFERENCES "VendorCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPaymentMethod" ADD FOREIGN KEY ("vendorBankAccountId") REFERENCES "VendorBankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorCard" ADD FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBankAccount" ADD FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundItem" ADD FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookSubscription" ADD FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD FOREIGN KEY ("subscriptionId") REFERENCES "WebhookSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundWebhookEvent" ADD FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueShare" ADD FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueShare" ADD FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
