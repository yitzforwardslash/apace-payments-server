-- AlterEnum
ALTER TYPE "VendorInvoicingCycleType" ADD VALUE 'BiWeekly';

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "allow_autopay" BOOLEAN NOT NULL DEFAULT false;
