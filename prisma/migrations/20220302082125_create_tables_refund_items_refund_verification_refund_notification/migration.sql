-- CreateEnum
CREATE TYPE "RequestMethod" AS ENUM ('get', 'post', 'patch', 'put', 'delete');

-- CreateEnum
CREATE TYPE "RefundSource" AS ENUM ('app', 'api');

-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "cardType" "CcType",
ADD COLUMN     "orderIds" TEXT[],
ADD COLUMN     "refundNotificationId" INTEGER,
ADD COLUMN     "refundVerificationId" INTEGER;

-- CreateTable
CREATE TABLE "RefundItem" (
    "id" SERIAL NOT NULL,
    "itemId" TEXT NOT NULL,
    "sku" TEXT,
    "itemUrl" TEXT,
    "itemImageUrl" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "returnDate" TEXT,
    "orderDate" TEXT,
    "orderUrl" TEXT,
    "unitPrice" DECIMAL(65,30),
    "returnQty" INTEGER,
    "refundId" INTEGER NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundVerification" (
    "id" SERIAL NOT NULL,
    "method" "RequestMethod" DEFAULT E'get',
    "url" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundNotification" (
    "id" SERIAL NOT NULL,
    "webhookUrl" TEXT NOT NULL,
    "redirectUrl" TEXT,
    "redirectMethod" "RequestMethod" NOT NULL DEFAULT E'post',

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Refund" ADD FOREIGN KEY ("refundVerificationId") REFERENCES "RefundVerification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD FOREIGN KEY ("refundNotificationId") REFERENCES "RefundNotification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundItem" ADD FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE CASCADE ON UPDATE CASCADE;
