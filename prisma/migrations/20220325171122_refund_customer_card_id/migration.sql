-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "customerCardId" INTEGER;

-- AddForeignKey
ALTER TABLE "Refund" ADD FOREIGN KEY ("customerCardId") REFERENCES "CustomerCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
