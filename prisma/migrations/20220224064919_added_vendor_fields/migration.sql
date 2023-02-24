-- CreateEnum
CREATE TYPE "IndustryEnum" AS ENUM ('Auto', 'Beauty', 'ElectiveMedical', 'Fashion', 'FitnessAndSportingGoods', 'Home', 'HomeImprovement', 'Lifestyle', 'MobileDevices', 'Travel', 'Other');

-- CreateEnum
CREATE TYPE "AverageMonthlyRefundsEnum" AS ENUM ('PreLaunch', 'LessThan100K', 'From100KTo500K', 'From500KTo1M', 'From1MAndUp');

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "Country" TEXT,
ADD COLUMN     "avg_monthly_refunds" "AverageMonthlyRefundsEnum",
ADD COLUMN     "industry" "IndustryEnum",
ADD COLUMN     "onboarded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "website" TEXT,
ALTER COLUMN "commercialName" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL;
