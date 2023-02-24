-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "defaultPaymentMethodId" INTEGER;

-- CreateTable
CREATE TABLE "VendorPaymentMethod" (
    "id" SERIAL NOT NULL,
    "vendorCardId" INTEGER,
    "vendorBankAccountId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Vendor" ADD FOREIGN KEY ("defaultPaymentMethodId") REFERENCES "VendorPaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPaymentMethod" ADD FOREIGN KEY ("vendorCardId") REFERENCES "VendorCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPaymentMethod" ADD FOREIGN KEY ("vendorBankAccountId") REFERENCES "VendorBankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
