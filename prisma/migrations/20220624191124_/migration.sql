/*
  Warnings:

  - A unique constraint covering the columns `[refundId]` on the table `RevenueShare` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `refundId` to the `RevenueShare` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vendorId` to the `RevenueShare` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RevenueShare" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "refundId" TEXT NOT NULL,
ADD COLUMN     "vendorId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "RevenueShare_refundId_unique" ON "RevenueShare"("refundId");

-- AddForeignKey
ALTER TABLE "RevenueShare" ADD FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueShare" ADD FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE CASCADE ON UPDATE CASCADE;
