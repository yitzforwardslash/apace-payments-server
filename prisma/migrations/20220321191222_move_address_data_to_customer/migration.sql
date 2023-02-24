/*
  Warnings:

  - You are about to drop the column `address1` on the `CustomerCard` table. All the data in the column will be lost.
  - You are about to drop the column `address2` on the `CustomerCard` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `CustomerCard` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `CustomerCard` table. All the data in the column will be lost.
  - You are about to drop the column `zip` on the `CustomerCard` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "address1" TEXT NOT NULL DEFAULT E'',
ADD COLUMN     "address2" TEXT,
ADD COLUMN     "city" TEXT NOT NULL DEFAULT E'',
ADD COLUMN     "state" TEXT NOT NULL DEFAULT E'',
ADD COLUMN     "zip" TEXT NOT NULL DEFAULT E'';

-- AlterTable
ALTER TABLE "CustomerCard" DROP COLUMN "address1",
DROP COLUMN "address2",
DROP COLUMN "city",
DROP COLUMN "state",
DROP COLUMN "zip";
