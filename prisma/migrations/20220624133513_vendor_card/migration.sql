-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "defaultCardId" INTEGER;

-- CreateTable
CREATE TABLE "VendorCard" (
    "id" SERIAL NOT NULL,
    "type" "CcType" NOT NULL,
    "fullName" TEXT NOT NULL,
    "network" TEXT,
    "number" TEXT NOT NULL,
    "expirationDate" TEXT,
    "cvv" TEXT NOT NULL,
    "lastFour" TEXT NOT NULL,
    "fundsAvailability" TEXT,
    "currency" TEXT,
    "vendorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorCard.vendorId_unique" ON "VendorCard"("vendorId");

-- AddForeignKey
ALTER TABLE "Vendor" ADD FOREIGN KEY ("defaultCardId") REFERENCES "VendorCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorCard" ADD FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
