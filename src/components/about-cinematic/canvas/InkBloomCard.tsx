import { useCallback, useEffect, useRef } from "react";
import AboutCanvasCard from "./AboutCanvasCard";
import type { CanvasConceptProps } from "./types";
import { useCardFade } from "./useCardFade";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { publicUrl } from "@/lib/publicUrl";

const INK_VIDEO = publicUrl("about-cinematic/ink-bleed.mp4", { bustCache: true });

/** rimmed.mp4 — 0.56→end, then 0→0.35 (freeze), bio centered on frozen frame */
const SEG1_START = 0.56;
const SEG2_END = 0.35;
/** Bio appears this many seconds of media time before the freeze */
const SEG2_CARD_LEAD = 0.18;
const SEG2_CARD_AT = SEG2_END - SEG2_CARD_LEAD;
/** Smooth slow-mo — seg1 (0.56→end) is much slower; seg2 (0→freeze) stays snappier */
const SEG1_PLAYBACK_RATE = 0.38;
const SEG2_PLAYBACK_RATE = 0.72;
/** Ignore seg2 timeupdates above this (stale events right after seg1→seg2 seek) */
const SEG2_MAX_T = 0.5;

type PlayPhase = "idle" | "seg1" | "seg2" | "done";

function setPlaybackRate(video: HTMLVideoElement, rate: number) {
  video.playbackRate = rate;
  video.defaultPlaybackRate = rate;
}

export default function InkBloomCard({ playKey = 0, onReady }: CanvasConceptProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const phaseRef = useRef<PlayPhase>("idle");
  const seg2ReadyRef = useRef(false);
  const cardRevealedRef = useRef(false);
  const reduced = useReducedMotion();
  const { cardOpacity, revealInstant, reset } = useCardFade(onReady);

  const revealCardEarly = useCallback(() => {
    if (cardRevealedRef.current) return;
    cardRevealedRef.current = true;
    revealInstant();
  }, [revealInstant]);

  const lockFrame = useCallback(
    (video: HTMLVideoElement) => {
      if (phaseRef.current === "done") return;
      phaseRef.current = "done";
      seg2ReadyRef.current = false;

      revealCardEarly();
      video.pause();
    },
    [revealCardEarly],
  );

  const startSegment2 = useCallback((video: HTMLVideoElement) => {
    phaseRef.current = "seg2";
    seg2ReadyRef.current = false;

    const onSeeked = () => {
      seg2ReadyRef.current = true;
      setPlaybackRate(video, SEG2_PLAYBACK_RATE);
      void video.play().catch(() => {});
    };

    video.addEventListener("seeked", onSeeked, { once: true });
    video.currentTime = 0;
  }, []);

  const startSegment1 = useCallback((video: HTMLVideoElement) => {
    phaseRef.current = "seg1";
    seg2ReadyRef.current = false;

    const onSeeked = () => {
      setPlaybackRate(video, SEG1_PLAYBACK_RATE);
      void video.play().catch(() => {});
    };

    video.addEventListener("seeked", onSeeked, { once: true });
    video.currentTime = SEG1_START;
  }, []);

  const beginPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const play = () => startSegment1(video);

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      play();
    } else {
      video.addEventListener("loadeddata", play, { once: true });
      video.load();
    }
  }, [startSegment1]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || phaseRef.current === "done") return;

    const t = video.currentTime;

    if (phaseRef.current === "seg1") {
      const atEnd = video.duration > 0 && t >= video.duration - 0.05;
      if (atEnd) startSegment2(video);
    } else if (phaseRef.current === "seg2" && seg2ReadyRef.current && t <= SEG2_MAX_T) {
      if (t >= SEG2_CARD_AT) revealCardEarly();
      if (t >= SEG2_END) lockFrame(video);
    }
  }, [lockFrame, revealCardEarly, startSegment2]);

  const handleEnded = useCallback(() => {
    const video = videoRef.current;
    if (!video || phaseRef.current === "done") return;
    if (phaseRef.current === "seg1") startSegment2(video);
  }, [startSegment2]);

  const runSequence = useCallback(() => {
    reset();
    cardRevealedRef.current = false;
    seg2ReadyRef.current = false;
    phaseRef.current = "idle";

    const video = videoRef.current;
    if (video) {
      video.pause();
      setPlaybackRate(video, SEG1_PLAYBACK_RATE);
    }

    if (reduced) {
      if (!video) return;
      video.addEventListener(
        "seeked",
        () => {
          revealCardEarly();
          window.setTimeout(() => {
            video.addEventListener("seeked", () => lockFrame(video), { once: true });
            video.currentTime = SEG2_END;
          }, SEG2_CARD_LEAD * 1000);
        },
        { once: true },
      );
      video.currentTime = SEG2_CARD_AT;
      return;
    }

    requestAnimationFrame(beginPlayback);
  }, [beginPlayback, lockFrame, reduced, reset, revealCardEarly]);

  useEffect(() => {
    runSequence();
  }, [playKey, runSequence]);

  return (
    <div className="cin-ink-stage absolute inset-0 overflow-hidden">
      <div className="cin-ink-transition pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        <video
          ref={videoRef}
          src={INK_VIDEO}
          className="cin-ink-transition__media"
          muted
          playsInline
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />
      </div>

      <AboutCanvasCard variant="ink" visible opacity={cardOpacity} overlay />
    </div>
  );
}
