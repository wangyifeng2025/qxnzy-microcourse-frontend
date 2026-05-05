import CommunityTopicPage from "@/components/community-topic-page";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ topicId: string }>;
}

export default async function CommunityTopicRoute({ params }: PageProps) {
  const { topicId } = await params;
  return <CommunityTopicPage topicId={topicId} />;
}
