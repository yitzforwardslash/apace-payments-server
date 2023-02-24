-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "emailOpenedAt" TIMESTAMP(3),
ADD COLUMN     "emailSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastStep" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "linkClickedAt" TIMESTAMP(3);
