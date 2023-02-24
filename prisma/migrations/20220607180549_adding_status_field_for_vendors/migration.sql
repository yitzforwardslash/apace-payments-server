-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('Created', 'Submitted', 'Pending_REVIEW', 'ACTIVE', 'DISABLED');

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "status" "VendorStatus" NOT NULL DEFAULT E'Created';
