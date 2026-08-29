import { useCallback, useEffect, useRef, useState } from "react";

interface UseVoiceToTextOptions {
  onTranscription: (text: string) => void;
  onError?: (error: string) => void;
}

/**
 * A structural type for the automatic-speech-recognition pipeline produced by
 * `@huggingface/transformers`. We keep it structural so the hook doesn't depend
 * on the exact type exports of the library.
 */
interface Transcriber {
  (
    audio: Float32Array,
    options?: {
      language?: string;
      task?: string;
      chunk_length_s?: number;
      stride_length_s?: number;
    },
  ): Promise<{ text?: string }>;
}

// Multilingual Whisper model: covers every language OctopusStudio is localized into
// (en, es, ko, pt-BR, zh-CN) and runs fully offline after a one-time download.
// The Whisper checkpoints now ship int4 "MatMulNBits" weights, which
// onnxruntime-web's WASM backend cannot load ("Missing required scale").
// Loading `fp32` weights avoids the quantized nodes entirely.
const WHISPER_MODEL_ID = "onnx-community/whisper-tiny";

// Map a BCP-47 language tag to a Whisper language name. Passing a known
// language skips auto-detection, which is faster and more accurate.
const LANGUAGE_BY_TAG: Record<string, string> = {
  en: "english",
  es: "spanish",
  pt: "portuguese",
  ko: "korean",
  zh: "chinese",
  fr: "french",
  de: "german",
  it: "italian",
  ja: "japanese",
  ru: "russian",
};

function whisperLanguageFromTag(tag: string | undefined): string | undefined {
  if (!tag) return undefined;
  const primary = tag.split("-")[0].toLowerCase();
  return LANGUAGE_BY_TAG[primary];
}

// The Whisper pipeline is expensive to load (first-time model download, then
// warm-up). Cache the promise so we only build it once per process.
let transcriberPromise: Promise<Transcriber> | null = null;

async function loadTranscriber(): Promise<Transcriber> {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      // Keep the downloaded model + WASM binaries around so transcription
      // works offline after the first run.
      env.useBrowserCache = true;
      env.useWasmCache = true;
      return (await pipeline("automatic-speech-recognition", WHISPER_MODEL_ID, {
        dtype: "fp32",
      })) as Transcriber;
    })().catch((error) => {
      // Allow a retry on the next invocation instead of caching the failure.
      transcriberPromise = null;
      throw error;
    });
  }
  return transcriberPromise;
}

// Decode a recorded blob (webm/opus) into 16kHz mono PCM samples for Whisper.
// Creating the AudioContext at 16kHz makes decodeAudioData resample for us.
function blobTo16kHzMonoFloat32(blob: Blob): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onerror = () =>
      reject(new Error("Unable to read the recorded audio."));
    fileReader.onload = () => {
      const AudioCtx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) {
        reject(
          new Error("Audio decoding is not supported in this environment."),
        );
        return;
      }
      const context = new AudioCtx({ sampleRate: 16000 });
      context.decodeAudioData(
        fileReader.result as ArrayBuffer,
        (audioBuffer) => {
          const channelCount = audioBuffer.numberOfChannels;
          const length = audioBuffer.length;
          let mono: Float32Array;
          if (channelCount === 1) {
            mono = audioBuffer.getChannelData(0);
          } else {
            mono = new Float32Array(length);
            for (let i = 0; i < length; i++) {
              let sum = 0;
              for (let c = 0; c < channelCount; c++) {
                sum += audioBuffer.getChannelData(c)[i];
              }
              mono[i] = sum / channelCount;
            }
          }
          void context.close();
          resolve(mono);
        },
        () => {
          void context.close();
          reject(new Error("Unable to decode the recorded audio."));
        },
      );
    };
    fileReader.readAsArrayBuffer(blob);
  });
}

interface RecordingSession {
  mediaRecorder: MediaRecorder;
  stream: MediaStream;
}

export function useVoiceToText({
  onTranscription,
  onError,
}: UseVoiceToTextOptions) {
  // Voice-to-text is disabled by default; the first toggle turns it on.
  const [isEnabled, setIsEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const callbacksRef = useRef({ onTranscription, onError });
  callbacksRef.current = { onTranscription, onError };

  const sessionRef = useRef<RecordingSession | null>(null);

  const transcribeBlob = useCallback(async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const samples = await blobTo16kHzMonoFloat32(blob);
      const transcriber = await loadTranscriber();
      const language = whisperLanguageFromTag(navigator.language);
      const result = await transcriber(samples, {
        task: "transcribe",
        ...(language ? { language } : {}),
      });
      const text = (result?.text ?? "").trim();
      if (text) {
        callbacksRef.current.onTranscription(text);
      }
    } catch (error) {
      callbacksRef.current.onError?.(
        error instanceof Error ? error.message : "Speech recognition failed.",
      );
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    sessionRef.current = null;
    setIsRecording(false);
    setIsTranscribing(true);
    try {
      session.mediaRecorder.stop();
    } catch {
      session.stream.getTracks().forEach((track) => track.stop());
      setIsTranscribing(false);
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (sessionRef.current) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      const message =
        error instanceof Error && error.name === "NotAllowedError"
          ? "Microphone access was denied."
          : "Unable to access the microphone.";
      callbacksRef.current.onError?.(message);
      return;
    }

    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(stream);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      callbacksRef.current.onError?.(
        "Audio recording is not supported in this environment.",
      );
      return;
    }

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };
    mediaRecorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const type = mediaRecorder.mimeType || "audio/webm";
      void transcribeBlob(new Blob(chunks, { type }));
    };
    mediaRecorder.onerror = () => {
      sessionRef.current = null;
      setIsRecording(false);
      stream.getTracks().forEach((track) => track.stop());
      callbacksRef.current.onError?.("Recording failed.");
    };

    sessionRef.current = { mediaRecorder, stream };
    setIsRecording(true);
    mediaRecorder.start();
  }, [transcribeBlob]);

  const toggleRecording = useCallback(() => {
    // First click enables voice-to-text and starts recording.
    if (!isEnabled) {
      setIsEnabled(true);
      void startRecording();
      return;
    }
    if (sessionRef.current) {
      stopRecording();
    } else {
      void startRecording();
    }
  }, [isEnabled, startRecording, stopRecording]);

  // Release the microphone and discard any in-flight recording on unmount.
  useEffect(() => {
    return () => {
      const session = sessionRef.current;
      if (session) {
        session.mediaRecorder.onstop = null;
        session.stream.getTracks().forEach((track) => track.stop());
      }
      sessionRef.current = null;
    };
  }, []);

  return { isEnabled, isRecording, isTranscribing, toggleRecording };
}
