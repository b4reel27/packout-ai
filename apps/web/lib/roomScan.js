import { apiFetch } from "./api";

export function compressPhotoToBase64(file, maxWidth = 1280, quality = 0.75) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / Math.max(img.width, 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({
        data: canvas.toDataURL("image/jpeg", quality),
        mediaType: "image/jpeg",
        name: file.name,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}

export async function runRoomScanApi({
  roomTypeHint = "living_room",
  notes = "",
  files = [],
} = {}) {
  const photos = (
    await Promise.all(files.slice(0, 4).map((f) => compressPhotoToBase64(f)))
  ).filter(Boolean);

  return apiFetch("/ai/scan-room", {
    method: "POST",
    body: JSON.stringify({ roomTypeHint, notes, photos }),
  });
}
