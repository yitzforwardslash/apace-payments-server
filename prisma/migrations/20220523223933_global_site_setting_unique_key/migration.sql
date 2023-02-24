/*
  Warnings:

  - A unique constraint covering the columns `[key]` on the table `GlobalSiteSetting` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "GlobalSiteSetting.key_unique" ON "GlobalSiteSetting"("key");
