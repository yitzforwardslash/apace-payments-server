/*
  Warnings:

  - You are about to drop the column `cardType` on the `CardPayout` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CardPayout" DROP COLUMN "cardType",
ADD COLUMN     "cardNetwork" TEXT;
