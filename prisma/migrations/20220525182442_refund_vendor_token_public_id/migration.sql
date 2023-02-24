-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "vendorTokenPublicId" TEXT;

-- AddForeignKey
ALTER TABLE "Refund" ADD FOREIGN KEY ("vendorTokenPublicId") REFERENCES "VendorToken"("publicId") ON DELETE SET NULL ON UPDATE CASCADE;
