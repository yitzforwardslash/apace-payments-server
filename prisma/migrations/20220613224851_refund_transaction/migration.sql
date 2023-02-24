-- CreateEnum
CREATE TYPE "RefundTransactionProcessor" AS ENUM ('aptpay');

-- CreateTable
CREATE TABLE "RefundTransaction" (
    "id" SERIAL NOT NULL,
    "transactionId" TEXT NOT NULL,
    "status" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "info" TEXT,
    "processor" "RefundTransactionProcessor" NOT NULL,

    PRIMARY KEY ("id")
);
