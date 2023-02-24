/*
  Warnings:

  - You are about to drop the column `expiration_month` on the `CustomerCard` table. All the data in the column will be lost.
  - You are about to drop the column `expiration_year` on the `CustomerCard` table. All the data in the column will be lost.
  - Added the required column `expirationMonth` to the `CustomerCard` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expirationYear` to the `CustomerCard` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CustomerCard" DROP COLUMN "expiration_month",
DROP COLUMN "expiration_year",
ADD COLUMN     "expirationMonth" INTEGER NOT NULL,
ADD COLUMN     "expirationYear" INTEGER NOT NULL;
