-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "vendorPaymentMethodId" INTEGER;

-- AddForeignKey
ALTER TABLE "Invoice" ADD FOREIGN KEY ("vendorPaymentMethodId") REFERENCES "VendorPaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
