-- AddColumn
ALTER TABLE "FinancialAccount" ADD COLUMN "pluggyAccountId" TEXT;

-- AddColumn
ALTER TABLE "Transaction" ADD COLUMN "pluggyTransactionId" TEXT;

-- CreateTable
CREATE TABLE "PluggyItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "connectorName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PluggyItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAccount_pluggyAccountId_key" ON "FinancialAccount"("pluggyAccountId");
CREATE UNIQUE INDEX "Transaction_pluggyTransactionId_key" ON "Transaction"("pluggyTransactionId");
CREATE UNIQUE INDEX "PluggyItem_userId_itemId_key" ON "PluggyItem"("userId", "itemId");
CREATE INDEX "PluggyItem_userId_idx" ON "PluggyItem"("userId");

-- AddForeignKey
ALTER TABLE "PluggyItem" ADD CONSTRAINT "PluggyItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
