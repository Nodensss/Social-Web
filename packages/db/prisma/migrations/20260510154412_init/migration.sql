-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('parent', 'child');

-- CreateEnum
CREATE TYPE "ToyStatus" AS ENUM ('processing', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('pending', 'accepted');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('heart', 'star', 'laugh');

-- CreateEnum
CREATE TYPE "JobKind" AS ENUM ('image_stylize', 'model_3d', 'bio_generate');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('queued', 'running', 'done', 'failed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "telegramId" TEXT,
    "displayName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'parent',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "familyId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyInvite" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'parent',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "FamilyInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildProfile" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthYear" INTEGER NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChildProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Toy" (
    "id" TEXT NOT NULL,
    "ownerChildId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "originalPhotoUrl" TEXT NOT NULL,
    "processedImageUrl" TEXT,
    "model3dUrl" TEXT,
    "bio" TEXT NOT NULL DEFAULT '',
    "personalityTraits" TEXT[],
    "catchphrases" TEXT[],
    "status" "ToyStatus" NOT NULL DEFAULT 'processing',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Toy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "toyAId" TEXT NOT NULL,
    "toyBId" TEXT NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "authorToyId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "mediaUrls" TEXT[],
    "generatedByAi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorToyId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "toyId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL DEFAULT 'heart',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessingJob" (
    "id" TEXT NOT NULL,
    "toyId" TEXT NOT NULL,
    "kind" "JobKind" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'queued',
    "providerJobId" TEXT,
    "payload" JSONB,
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Family_ownerId_key" ON "Family"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyInvite_code_key" ON "FamilyInvite"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_toyAId_toyBId_key" ON "Friendship"("toyAId", "toyBId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_postId_toyId_type_key" ON "Reaction"("postId", "toyId", "type");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Family" ADD CONSTRAINT "Family_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyInvite" ADD CONSTRAINT "FamilyInvite_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildProfile" ADD CONSTRAINT "ChildProfile_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Toy" ADD CONSTRAINT "Toy_ownerChildId_fkey" FOREIGN KEY ("ownerChildId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_toyAId_fkey" FOREIGN KEY ("toyAId") REFERENCES "Toy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_toyBId_fkey" FOREIGN KEY ("toyBId") REFERENCES "Toy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorToyId_fkey" FOREIGN KEY ("authorToyId") REFERENCES "Toy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorToyId_fkey" FOREIGN KEY ("authorToyId") REFERENCES "Toy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_toyId_fkey" FOREIGN KEY ("toyId") REFERENCES "Toy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessingJob" ADD CONSTRAINT "ProcessingJob_toyId_fkey" FOREIGN KEY ("toyId") REFERENCES "Toy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
