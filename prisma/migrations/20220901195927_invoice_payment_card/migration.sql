-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "paymentCardId" INTEGER;

-- AddForeignKey
ALTER TABLE "Invoice" ADD FOREIGN KEY ("paymentCardId") REFERENCES "VendorCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "RevenueShare_refundId_unique" RENAME TO "RevenueShare.refundId_unique";
