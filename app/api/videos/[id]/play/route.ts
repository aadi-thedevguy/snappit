import { NextRequest, NextResponse } from 'next/server';
import { generateSignedVideoUrl } from '@/lib/actions/video';
import { auth } from '@/lib/auth'; 
import { videos, user } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import aj, { shield, slidingWindow } from '@/lib/arcjet';
import { db } from '@/drizzle/db';

const rateLimit = aj
  .withRule(shield({ mode: "LIVE" }))
  .withRule(
    slidingWindow({
      mode: "LIVE",
      interval: "1m",
      max: 10, // Max 10 requests per minute per IP
    }),
  );

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const decision = await rateLimit.protect(request);
    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
      }
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const videoId = id;

    const [videoData] = await db
      .select({
        video: videos,
        user: { id: user.id, name: user.name, image: user.image },
      })
      .from(videos)
      .leftJoin(user, eq(videos.userId, user.id))
      .where(eq(videos.videoId, videoId));
      
    const video = videoData?.video;
    
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const session = await auth.api.getSession({ headers: await headers() });
    const sessionUser = session?.user;
    
    const isOwner = sessionUser?.id === video.userId;
    const isPublic = video.visibility === 'public';

    if (!isPublic && !isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const signedUrl = await generateSignedVideoUrl(video.videoId);
    return NextResponse.json({ signedUrl });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
