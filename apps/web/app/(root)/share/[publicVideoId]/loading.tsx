import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const Loading = () => {
  return (
    <main className="min-h-screen bg-background">
      <section className="container mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main video section */}
          <div className="lg:col-span-2 space-y-5">
            {/* VideoDetailHeader skeleton */}
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />

                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-20 rounded-md" />
                  <Skeleton className="h-9 w-9 rounded-md" />
                </div>
              </div>
            </div>

            {/* Video player skeleton */}
            <div className="rounded-xl overflow-hidden shadow-card bg-foreground/5">
              <Skeleton className="aspect-video w-full rounded-none" />
            </div>
          </div>

          {/* VideoInfo skeleton */}
          <Card className="h-fit">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>

              <div className="space-y-3">
                <Skeleton className="h-5 w-20" />

                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>

                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>

                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>

              <Skeleton className="h-10 w-full rounded-md" />
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
};

export default Loading;
