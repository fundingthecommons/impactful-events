-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "featureApplicantVetting" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "featureAsksOffers" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "featureImpactAnalytics" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "featureMentorVetting" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "featureNewsfeed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "featurePraise" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "featureProjects" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "featureSpeakerVetting" BOOLEAN NOT NULL DEFAULT true;
