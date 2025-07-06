import { daysAgo } from '@/lib/utils';
import React from 'react'

type Props = {
    video: {
        title: string;
        createdAt: Date;
        // publicVideoId: string;
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
    {/* <div className="actions">
      <button
        onClick={() => {
          navigator.clipboard.writeText(`${window.location.origin}/share/${video.publicVideoId}`);
          alert("Link copied to clipboard!");
        }}
        className="copy-link-btn"
      >
        Copy Link
      </button>
    </div> */}
}

export default PublicVideoDetail