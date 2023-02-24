-- CreateEnum
CREATE TYPE "RevenueShareStatus" AS ENUM ('available', 'paid');

-- AlterTable
ALTER TABLE "RevenueShare" ADD COLUMN     "status" TEXT NOT NULL DEFAULT E'available';
