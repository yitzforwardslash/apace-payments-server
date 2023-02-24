/*
  Warnings:

  - You are about to drop the column `allow_setup` on the `Vendor` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "allow_setup",
ADD COLUMN     "setupEnabled" BOOLEAN NOT NULL DEFAULT false;
