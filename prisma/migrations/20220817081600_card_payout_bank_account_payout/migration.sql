/*
  Warnings:

  - You are about to drop the column `toCardLastFour` on the `Payout` table. All the data in the column will be lost.
  - You are about to drop the column `toCardType` on the `Payout` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PayoutToType" AS ENUM ('CARD', 'BANK_ACCOUNT');

-- AlterTable
ALTER TABLE "Payout" DROP COLUMN "toCardLastFour",
DROP COLUMN "toCardType",
ADD COLUMN     "bankAccountPayoutId" INTEGER,
ADD COLUMN     "cardPayoutId" INTEGER,
ADD COLUMN     "toId" INTEGER,
ADD COLUMN     "toType" "PayoutToType";

-- CreateTable
CREATE TABLE "CardPayout" (
    "id" SERIAL NOT NULL,
    "cardLastFour" TEXT,
    "cardType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccountPayout" (
    "id" SERIAL NOT NULL,
    "accountNumberLastFour" TEXT,
    "routingNumberLastFour" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Payout" ADD FOREIGN KEY ("cardPayoutId") REFERENCES "CardPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD FOREIGN KEY ("bankAccountPayoutId") REFERENCES "BankAccountPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
