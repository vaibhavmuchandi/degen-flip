-- CreateTable
CREATE TABLE "Bet" (
    "id" SERIAL NOT NULL,
    "bettor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "txnHash" TEXT NOT NULL,
    "randHash" JSONB NOT NULL,
    "pseudoHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "hasWon" BOOLEAN NOT NULL,
    "finalizeTxn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);
