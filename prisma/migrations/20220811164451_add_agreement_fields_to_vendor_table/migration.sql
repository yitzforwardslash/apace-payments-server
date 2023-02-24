-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "agreementDate" TIMESTAMP(3),
ADD COLUMN     "agreementSigned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "agreementUrl" TEXT;
