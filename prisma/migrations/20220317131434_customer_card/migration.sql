-- CreateTable
CREATE TABLE "CustomerCard" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CcType" NOT NULL,
    "fullName" TEXT NOT NULL,
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "expiration_month" INTEGER NOT NULL,
    "expiration_year" INTEGER NOT NULL,
    "cvv" TEXT NOT NULL,

    PRIMARY KEY ("id")
);
