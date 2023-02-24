-- CreateTable
CREATE TABLE "QuickbooksSalesAccount" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "quickbooksId" TEXT NOT NULL,
    "quickbooksSyncToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);
