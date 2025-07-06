import { redirect } from "next/navigation";

import { getAllVideos } from "@/lib/actions/video";
import { EmptyState, Pagination, SharedHeader, VideoCard } from "@/components";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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
    Number(page) || 1
  );
  if (!user) redirect("/404");

  return (
    <main className="wrapper page">
      <SharedHeader
        subHeader={user?.email}
        title={user?.name}
        userImg={user?.image ?? ""}
      />

      {videos?.length > 0 ? (
        <section className="video-grid">
          {videos.map(({ video }) => (
            <VideoCard
              key={video.id}
              id={video.videoId}
              title={video.title}
              thumbnail={video.thumbnailUrl}
              createdAt={video.createdAt}
              userImg={user.image ?? ""}
              username={user.name ?? "Guest"}
              views={video.views}
              visibility={video.visibility}
              duration={video.duration}
            />
          ))}
        </section>
      ) : (
        <EmptyState
          icon="/assets/icons/video.svg"
          title="No Videos Available Yet"
          description="Video will show up here once you upload them."
        />
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
