-- CreateTable
CREATE TABLE "Log" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "actionOn" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "oldValues" TEXT,
    "newValues" TEXT,
    "updatedFields" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);
