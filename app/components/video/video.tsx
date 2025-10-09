import React from "react";

type VideoPlayerProps = {
  url: string;
};

const VideoPlayer = ({ url }: VideoPlayerProps) => {
  if (!url) return <p>No video URL provided</p>;

  // Check if it's YouTube
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (youtubeMatch) {
    const videoId = youtubeMatch[1];
    return (
      <iframe
        className="w-full h-full"
        width="100%"
        height="400"
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    );
  }

  // Check if it's Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    return (
      <iframe
        src={`https://player.vimeo.com/video/${videoId}`}
        width="100%"
        height="400"
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        title="Vimeo video player"
      ></iframe>
    );
  }

  // Check if it's a direct video file (.mp4, .webm, .ogg)
  if (/\.(mp4|webm|ogg)$/i.test(url.split("?")[0])) {
    return (
      <video width="100%" height="400" controls controlsList="nodownload">
        <source
          src={url}
          type={`video/${url.split("?")[0].split(".").pop()}`}
        />
        Your browser does not support the video tag.
      </video>
    );
  }

  return <p>Unsupported video format</p>;
};

export default VideoPlayer;
