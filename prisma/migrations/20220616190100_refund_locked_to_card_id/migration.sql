-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "lockedToCardId" INTEGER;

-- AddForeignKey
ALTER TABLE "Refund" ADD FOREIGN KEY ("lockedToCardId") REFERENCES "CustomerCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
