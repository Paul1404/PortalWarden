-- CreateTable
CREATE TABLE "ValidTag" (
    "id" SERIAL NOT NULL,
    "tag" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValidTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ValidTag_tag_key" ON "ValidTag"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
