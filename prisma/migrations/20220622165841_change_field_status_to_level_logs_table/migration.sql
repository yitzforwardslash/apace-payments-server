/*
  Warnings:

  - You are about to drop the column `status` on the `Log` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('info', 'error', 'warn', 'debug');

-- AlterTable
ALTER TABLE "Log" DROP COLUMN "status",
ADD COLUMN     "level" "LogLevel" NOT NULL DEFAULT E'info';
