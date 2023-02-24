-- CreateEnum
CREATE TYPE "VendorInvoicingCycleType" AS ENUM ('Daily', 'TenDays');

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "invoicingCycleType" "VendorInvoicingCycleType" NOT NULL DEFAULT E'TenDays',
ADD COLUMN     "lastInvoicedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
