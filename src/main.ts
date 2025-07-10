import "./reset.css";
import "./style.css";

interface MoveCue {
  text: string;
  type: "move";
  from: { x: number; y: number };
  to: { x: number; y: number };
  id: string;
  startTime: number;
  endTime: number;
}

interface SimpleCue {
  text: string;
  id: string;
  startTime: number;
  endTime: number;
}

type CueMeta = MoveCue | SimpleCue;

let activeCues: CueMeta[] = [];
let videoFrameRequestId: number | null = null;

function updateCues(currentTime: number) {
  activeCues.forEach((cue) => {
    const cueElement = document.getElementById(`cue-${cue.id}`);
    if (!cueElement) return;

    if ("type" in cue && cue.type === "move" && cue.from && cue.to) {
      const progress = Math.max(
        0,
        Math.min(1, (currentTime - cue.startTime) / (cue.endTime - cue.startTime))
      );

      const xDistance = cue.to.x - cue.from.x;
      const yDistance = cue.to.y - cue.from.y;

      const newX = cue.from.x + xDistance * progress;
      const newY = cue.from.y + yDistance * progress;

      cueElement.style.left = `${newX}px`;
      cueElement.style.top = `${newY}px`;
    }
  });
}

function animateCuesWithVideoFrame(video: HTMLVideoElement) {
  updateCues(video.currentTime);
  videoFrameRequestId = video.requestVideoFrameCallback(() => animateCuesWithVideoFrame(video));
}

window.onload = () => {
  const video = document.getElementById("video") as HTMLVideoElement;
  const overlay = document.getElementById("overlay") as HTMLDivElement;

  video.addEventListener("play", () => {
    if (!videoFrameRequestId) animateCuesWithVideoFrame(video);
  });

  video.addEventListener("pause", () => {
    if (videoFrameRequestId !== null) {
      video.cancelVideoFrameCallback(videoFrameRequestId);
      videoFrameRequestId = null;
    }
  });

  video.addEventListener("seeking", () => {
    updateCues(video.currentTime);
  });

  video.currentTime = 22;
  const textTracks = video.textTracks;

  if (textTracks.length < 2) return;

  textTracks[0].mode = "hidden";
  textTracks[1].mode = "hidden";

  const metadataTextTrack = textTracks[1];

  metadataTextTrack.oncuechange = function () {
    const cues = Array.from(metadataTextTrack.activeCues ?? []);

    if (cues.length === 0) {
      activeCues = [];
      overlay.innerHTML = "";
      return;
    }

    activeCues = [];
    overlay.innerHTML = "";

    cues.forEach((cue: any) => {
      let cueProperties: any;
      try {
        cueProperties = JSON.parse(cue.text);
      } catch {
        cueProperties = { text: cue.text };
      }

      if (cueProperties.type === "move" && cueProperties.from && cueProperties.to) {
        const moveCue: MoveCue = {
          ...cueProperties,
          id: cue.id,
          startTime: cue.startTime,
          endTime: cue.endTime,
        };
        activeCues.push(moveCue);

        const cueDiv = document.createElement("div");
        cueDiv.className = "overlay-cue";
        cueDiv.id = `cue-${cue.id}`;
        cueDiv.textContent = cueProperties.text;
        cueDiv.style.position = "absolute";
        cueDiv.style.left = `${cueProperties.from.x}px`;
        cueDiv.style.top = `${cueProperties.from.y}px`;
        cueDiv.setAttribute("data-text", cueProperties.text);
        overlay.appendChild(cueDiv);
      } else {
        const simpleCue: SimpleCue = {
          text: cueProperties.text,
          id: cue.id,
          startTime: cue.startTime,
          endTime: cue.endTime,
        };
        activeCues.push(simpleCue);
        overlay.innerHTML = `<div class="cue"><span class="overlay-cue" data-text="${cueProperties.text}" id="cue-${cue.id}">${cueProperties.text}</span></div>`;
      }
    });
  };
};
