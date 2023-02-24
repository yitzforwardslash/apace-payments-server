-- CreateEnum
CREATE TYPE "InvoiceChargeProcessor" AS ENUM ('stripe', 'aptpay');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "chargeProcessor" "InvoiceChargeProcessor" NOT NULL DEFAULT E'stripe';
