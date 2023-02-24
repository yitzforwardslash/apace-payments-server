/*
  Warnings:

  - Added the required column `quickbooksName` to the `QuickbooksSalesAccount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "QuickbooksSalesAccount" ADD COLUMN     "quickbooksName" TEXT NOT NULL;
