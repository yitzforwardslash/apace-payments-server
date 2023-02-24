-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "allow_notify" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consent" TEXT,
ADD COLUMN     "ecommerce_platform" TEXT;
