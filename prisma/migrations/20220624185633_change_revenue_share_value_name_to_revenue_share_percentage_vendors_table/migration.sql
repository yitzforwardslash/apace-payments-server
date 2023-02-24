-- CreateTable
CREATE TABLE "RevenueShare" (
    "id" SERIAL NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "percentage" DECIMAL(10,2) NOT NULL,

    PRIMARY KEY ("id")
);
