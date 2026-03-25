import { redirect } from "next/navigation";
import { getAllVideos } from "@/lib/actions/video";
import VideoGrid from "@/components/VideoGrid";
import SharedHeader from "@/components/SharedHeader";
import Pagination from "@/components/Pagination";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Monitor, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const ProfilePage = async ({ searchParams }: ParamsWithSearch) => {
  const { query, filter, page } = await searchParams;

  const currentUserId = (
    await auth.api.getSession({ headers: await headers() })
  )?.user.id;

  if (!currentUserId) redirect("/404");

  const { user, videos, pagination } = await getAllVideos(
    currentUserId,
    query,
    filter,
    Number(page) || 1,
  );
  if (!user) redirect("/404");

  const filtered = videos.map((video) => ({
    id: video.video.id,
    duration: video.video.duration,
    createdAt: video.video.createdAt,
    updatedAt: video.video.updatedAt,
    title: video.video.title,
    description: video.video.description,
    visibility: video.video.visibility,
    views: video.video.views,
    thumbnailUrl: video.video.thumbnailUrl,
    videoUrl: video.video.videoUrl,
    videoId: video.video.videoId,
    publicVideoId: video.video.publicVideoId,
    userId: video.video.userId,
  }));

  return (
    <main className="container mx-auto py-8 px-4">
      <SharedHeader videoLength={filtered.length || 0} />
      {filtered?.length === 0 ? (
        <section className="flex flex-col items-center justify-center py-24 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Video className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-display font-semibold text-foreground mb-2">
            No recordings yet
          </h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Start by recording your screen. Your recordings will appear here.
          </p>
          <Link href="/record">
            <Button className="bg-sky-100 hover:bg-sky-100/80 px-4 py-6 rounded-full shadow-elegant gap-2">
              <Monitor className="h-4 w-4" />
              Start Recording
            </Button>
          </Link>
        </section>
      ) : (
        <VideoGrid videos={filtered} />
      )}
      {pagination?.totalPages > 1 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          queryString={query}
          filterString={filter}
        />
      )}
    </main>
  );
};

export default ProfilePage;
