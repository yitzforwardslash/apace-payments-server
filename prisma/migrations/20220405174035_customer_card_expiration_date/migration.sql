/*
  Warnings:

  - You are about to drop the column `expirationMonth` on the `CustomerCard` table. All the data in the column will be lost.
  - You are about to drop the column `expirationYear` on the `CustomerCard` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CustomerCard" DROP COLUMN "expirationMonth",
DROP COLUMN "expirationYear",
ADD COLUMN     "expirationDate" TEXT;
