-- AlterTable
ALTER TABLE "AskOfferLike" ADD COLUMN     "kudosTransferred" DOUBLE PRECISION,
ADD COLUMN     "likerKudosAtTime" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Praise" ADD COLUMN     "kudosTransferred" DOUBLE PRECISION,
ADD COLUMN     "senderKudosAtTime" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ProjectUpdateLike" ADD COLUMN     "kudosTransferred" DOUBLE PRECISION,
ADD COLUMN     "likerKudosAtTime" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "kudos" DOUBLE PRECISION NOT NULL DEFAULT 130.0;

-- AlterTable
ALTER TABLE "UserProjectLike" ADD COLUMN     "kudosTransferred" DOUBLE PRECISION,
ADD COLUMN     "likerKudosAtTime" DOUBLE PRECISION;
