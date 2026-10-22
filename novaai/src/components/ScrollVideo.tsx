import { useEffect, useRef, useState } from 'react';
import { HERO_POSTER_URL, HERO_VIDEO_URL } from '../assets';

const LERP = 0.12;
const MAX_FRAMES = 90;
const MIN_FRAMES = 24;
const FRAMES_PER_SECOND = 12;
const MAX_FRAME_WIDTH = 960;
const SEEK_THRESHOLD = 0.04;
const END_PADDING = 0.05;

function scrollProgress() {
  const range = document.documentElement.scrollHeight - window.innerHeight;
  if (range <= 0) return 0;
  return Math.min(1, Math.max(0, window.scrollY / range));
}

function once(target: EventTarget, event: string) {
  return new Promise<void>((resolve, reject) => {
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(`Failed waiting for ${event}`));
    };
    const cleanup = () => {
      target.removeEventListener(event, onEvent);
      target.removeEventListener('error', onError);
    };
    target.addEventListener(event, onEvent);
    target.addEventListener('error', onError);
  });
}

// Draw `source` into the canvas with object-cover semantics (scale to fill, center crop).
function drawCover(ctx: CanvasRenderingContext2D, source: CanvasImageSource, sw: number, sh: number) {
  const { width: cw, height: ch } = ctx.canvas;
  const scale = Math.max(cw / sw, ch / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(source, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
}

async function extractFrames(isCancelled: () => boolean): Promise<ImageBitmap[]> {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = HERO_VIDEO_URL;
  video.load();

  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) await once(video, 'loadeddata');

  const duration = video.duration;
  const count = Math.min(MAX_FRAMES, Math.max(MIN_FRAMES, Math.round(duration * FRAMES_PER_SECOND)));
  const width = Math.min(MAX_FRAME_WIDTH, video.videoWidth);
  const height = Math.round((video.videoHeight / video.videoWidth) * width);
  const end = Math.max(0, duration - END_PADDING);
  const frames: ImageBitmap[] = [];

  try {
    for (let i = 0; i < count; i++) {
      if (isCancelled()) break;
      const seeked = once(video, 'seeked');
      video.currentTime = (i / (count - 1)) * end;
      await seeked;
      frames.push(await createImageBitmap(video, { resizeWidth: width, resizeHeight: height, resizeQuality: 'medium' }));
    }
  } catch (err) {
    frames.forEach((f) => f.close());
    throw err;
  } finally {
    video.removeAttribute('src');
    video.load();
  }

  if (isCancelled()) {
    frames.forEach((f) => f.close());
    return [];
  }
  return frames;
}

export default function ScrollVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<ImageBitmap[]>([]);
  const [posterFailed, setPosterFailed] = useState(false);
  const [videoHasFrame, setVideoHasFrame] = useState(false);
  const [framesReady, setFramesReady] = useState(false);

  // Scroll → smoothed progress → canvas frame (or video seek fallback).
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let target = scrollProgress();
    let smoothed = target;
    let lastDrawn = -1;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      lastDrawn = -1;
      target = scrollProgress();
    };
    const onScroll = () => {
      target = scrollProgress();
    };

    const tick = () => {
      smoothed += (target - smoothed) * LERP;
      const frames = framesRef.current;
      const video = videoRef.current;

      if (frames.length > 0) {
        const index = Math.round(smoothed * (frames.length - 1));
        if (index !== lastDrawn) {
          const frame = frames[index];
          drawCover(ctx, frame, frame.width, frame.height);
          lastDrawn = index;
        }
      } else if (video && video.readyState >= HTMLMediaElement.HAVE_METADATA && !video.seeking) {
        const time = smoothed * Math.max(0, video.duration - END_PADDING);
        if (Math.abs(video.currentTime - time) > SEEK_THRESHOLD) video.currentTime = time;
      }
      raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', onScroll, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Build the frame cache once the visible video has decoded its first frame.
  useEffect(() => {
    if (!videoHasFrame) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      extractFrames(() => cancelled)
        .then((frames) => {
          if (cancelled || frames.length === 0) return;
          framesRef.current = frames;
          setFramesReady(true);
        })
        .catch(() => {
          // Keep scrubbing the visible <video> via seeking.
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [videoHasFrame]);

  useEffect(
    () => () => {
      framesRef.current.forEach((f) => f.close());
      framesRef.current = [];
    },
    [],
  );

  const fade = 'absolute inset-0 h-full w-full object-cover transition-opacity duration-500';

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0a0a0a]" aria-hidden="true">
      {!posterFailed && (
        <img
          src={HERO_POSTER_URL}
          alt=""
          onError={() => setPosterFailed(true)}
          className={`${fade} ${videoHasFrame || framesReady ? 'opacity-0' : 'opacity-100'}`}
        />
      )}
      <video
        ref={videoRef}
        src={HERO_VIDEO_URL}
        muted
        playsInline
        preload="auto"
        onLoadedData={() => setVideoHasFrame(true)}
        className={`${fade} ${videoHasFrame && !framesReady ? 'opacity-100' : 'opacity-0'}`}
      />
      <canvas ref={canvasRef} className={`${fade} ${framesReady ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  );
}
