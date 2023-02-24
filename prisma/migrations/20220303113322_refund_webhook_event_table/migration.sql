-- CreateTable
CREATE TABLE "RefundWebhookEvent" (
    "id" SERIAL NOT NULL,
    "refundId" INTEGER NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "trials" INTEGER NOT NULL DEFAULT 0,
    "lastTrialAt" TIMESTAMP(3),

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RefundWebhookEvent" ADD FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE CASCADE ON UPDATE CASCADE;
