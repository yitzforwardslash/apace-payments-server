/*
  Warnings:

  - You are about to drop the column `transaction` on the `Refund` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Refund" DROP COLUMN "transaction",
ADD COLUMN     "transactionId" INTEGER;

-- AddForeignKey
ALTER TABLE "Refund" ADD FOREIGN KEY ("transactionId") REFERENCES "RefundTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
