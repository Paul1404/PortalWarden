-- CreateTable
CREATE TABLE "RfidLog" (
    "id" SERIAL NOT NULL,
    "rfidId" BIGINT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RfidLog_pkey" PRIMARY KEY ("id")
);
