import { daysAgo } from '@/lib/utils';
import React from 'react'

type Props = {
    video: {
        title: string;
        createdAt: Date;
    };
}
function PublicVideoDetail({video}: Props) {
  return (
    <header className="detail-header">
      <aside className="user-info">
        <h1>{video.title}</h1>
        <figure>
            <h2>Guest</h2>
          <figcaption>
            <span className="mt-1">・</span>
            <p>{daysAgo(video.createdAt)}</p>
          </figcaption>
        </figure>
      </aside>
    </header>
  )
}

export default PublicVideoDetail