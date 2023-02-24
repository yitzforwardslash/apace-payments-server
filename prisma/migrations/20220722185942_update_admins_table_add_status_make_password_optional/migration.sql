-- CreateEnum
CREATE TYPE "AdminStatus" AS ENUM ('INVITED', 'ACTIVE');

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "status" "AdminStatus" NOT NULL DEFAULT E'INVITED',
ALTER COLUMN "password" DROP NOT NULL;
