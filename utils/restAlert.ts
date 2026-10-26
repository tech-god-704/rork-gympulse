// Shared by the rest timer sheet and the floating rest bar.

// Generate a short 880Hz beep tone as a WAV data URI (no network needed)
function generateBeepWav(): string {
  const sampleRate = 22050;
  const duration = 0.15; // 150ms per beep
  const frequency = 880; // A5 note - gentle, not jarring
  const numSamples = Math.floor(sampleRate * duration);
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = numSamples * blockAlign;
  const fileSize = 36 + dataSize;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, fileSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // Generate sine wave with fade-in/out envelope
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, i / (numSamples * 0.1)) * Math.min(1, (numSamples - i) / (numSamples * 0.2));
    const sample = Math.sin(2 * Math.PI * frequency * t) * 0.4 * envelope;
    view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, sample * 32767)), true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 =
    typeof btoa !== "undefined" ? btoa(binary) : Buffer.from(buffer).toString("base64");

  return `data:audio/wav;base64,${base64}`;
}

let cachedBeepUri: string | null = null;
export function getBeepUri(): string {
  if (!cachedBeepUri) cachedBeepUri = generateBeepWav();
  return cachedBeepUri;
}

