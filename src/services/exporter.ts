import { Project, Scene } from '../types';

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image: ${src}`));
    img.src = src;
  });

const sceneDuration = (scene: Scene) => Math.max(1, scene.audioDurationSec || 3);

/**
 * Renders the project scenes to a canvas and records them with MediaRecorder.
 * Browser MediaRecorder cannot emit H.264/MP4, so the container is WebM.
 */
export const exportProjectVideo = async (project: Project): Promise<{ fileName: string; mimeType: string }> => {
  const width = project.aspectRatio === '9:16' ? 720 : 1280;
  const height = project.aspectRatio === '9:16' ? 1280 : 720;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is unavailable in this browser');

  const scenes = project.scenes.length ? project.scenes : [];
  const images = await Promise.all(
    scenes.map((scene) => loadImage(scene.imageUrl || project.thumbnailUrl).catch(() => null))
  );

  const stream = canvas.captureStream(30);
  const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(
    (type) => (window as unknown as { MediaRecorder?: typeof MediaRecorder }).MediaRecorder?.isTypeSupported(type)
  );
  if (!mimeType) throw new Error('This browser cannot record video');

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const finished = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start();

  for (let i = 0; i < scenes.length; i++) {
    const img = images[i];
    const seconds = sceneDuration(scenes[i]);
    const startedAt = performance.now();
    await new Promise<void>((resolve) => {
      const draw = () => {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        if (img) {
          const scale = Math.max(width / img.width, height / img.height);
          const drawWidth = img.width * scale;
          const drawHeight = img.height * scale;
          ctx.drawImage(img, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, height - 140, width, 140);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(scenes[i].sceneText.slice(0, 70), width / 2, height - 55);
        if (performance.now() - startedAt >= seconds * 1000) {
          resolve();
          return;
        }
        requestAnimationFrame(draw);
      };
      draw();
    });
  }

  recorder.stop();
  await finished;

  const blob = new Blob(chunks, { type: mimeType });
  const safeTitle = project.title.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'project';
  const fileName = `${safeTitle}.webm`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);

  return { fileName, mimeType };
};

/** Manifest fallback used when the browser cannot record video. */
export const downloadProjectManifest = (project: Project): string => {
  const payload = JSON.stringify(project, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${project.title.replace(/[^a-z0-9-_]+/gi, '-') || 'project'}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return link.download;
};
