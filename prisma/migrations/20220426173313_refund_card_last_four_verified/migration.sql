-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "cardLastFourVerified" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "cardLastFour" DROP NOT NULL;
