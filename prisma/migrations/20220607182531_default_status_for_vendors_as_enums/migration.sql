/*
  Warnings:

  - The values [Created,Submitted,Pending_REVIEW] on the enum `VendorStatus` will be removed. If these variants are still used in the database, this will fail.

*/

ALTER TABLE "Vendor" DROP COLUMN "status";
DROP TYPE "VendorStatus";
CREATE TYPE "VendorStatus" AS ENUM ('CREATED', 'SUBMITTED', 'PENDING_REVIEW', 'ACTIVE', 'DISABLED');
ALTER TABLE "Vendor" ADD COLUMN     "status" "VendorStatus" NOT NULL DEFAULT E'CREATED';
