import { renderHook, act } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { useVoiceToText } from "@/hooks/useVoiceToText";

const { pipelineMock, envMock } = vi.hoisted(() => ({
  pipelineMock: vi.fn(),
  envMock: {} as Record<string, unknown>,
}));

// Never load the real (heavy) WASM speech engine during tests.
vi.mock("@huggingface/transformers", () => ({
  pipeline: pipelineMock,
  env: envMock,
}));

type MockMediaRecorder = {
  mimeType: string;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  ondataavailable: ((event: { data: Blob | null }) => void) | null;
  onstop: (() => void) | null;
  onerror: (() => void) | null;
};

function installMediaRecorderMock(): { instances: MockMediaRecorder[] } {
  const instances: MockMediaRecorder[] = [];
  const MediaRecorderMock = vi.fn(function (this: MockMediaRecorder) {
    this.mimeType = "audio/webm";
    this.start = vi.fn();
    this.stop = vi.fn();
    this.ondataavailable = null;
    this.onstop = null;
    this.onerror = null;
    instances.push(this);
  });
  Object.defineProperty(globalThis, "MediaRecorder", {
    value: MediaRecorderMock,
    configurable: true,
    writable: true,
  });
  return { instances };
}

function installAudioContextMock() {
  const AudioContextMock = vi.fn(function (
    this: {
      sampleRate: number;
      close: ReturnType<typeof vi.fn>;
      decodeAudioData: ReturnType<typeof vi.fn>;
    },
    opts?: { sampleRate?: number },
  ) {
    this.sampleRate = opts?.sampleRate ?? 44100;
    this.close = vi.fn().mockResolvedValue(undefined);
    this.decodeAudioData = vi.fn(
      (_buffer: ArrayBuffer, onSuccess: (buffer: unknown) => void) => {
        const channelData = new Float32Array([0.1, 0.2, 0.3]);
        onSuccess({
          numberOfChannels: 1,
          length: 3,
          getChannelData: () => channelData,
        });
      },
    );
  });
  Object.defineProperty(window, "AudioContext", {
    value: AudioContextMock,
    configurable: true,
    writable: true,
  });
}

describe("useVoiceToText", () => {
  let getUserMediaMock: ReturnType<typeof vi.fn>;
  let tracks: Array<{ stop: ReturnType<typeof vi.fn> }>;
  let streamMock: MediaStream;

  beforeEach(() => {
    vi.useRealTimers();
    pipelineMock.mockReset();
    envMock.useBrowserCache = false;

    tracks = [{ stop: vi.fn() }];
    streamMock = { getTracks: () => tracks } as unknown as MediaStream;
    getUserMediaMock = vi.fn().mockResolvedValue(streamMock);
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: getUserMediaMock },
      configurable: true,
    });

    installMediaRecorderMock();
    installAudioContextMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error - cleanup of test-injected globals
    delete globalThis.MediaRecorder;
    // @ts-expect-error - cleanup of test-injected global
    delete window.AudioContext;
    // @ts-expect-error - cleanup of test-injected global
    delete navigator.mediaDevices;
  });

  it("starts disabled and enables on the first toggle, starting recording", async () => {
    const { result } = renderHook(() =>
      useVoiceToText({ onTranscription: vi.fn() }),
    );

    expect(result.current.isEnabled).toBe(false);
    expect(result.current.isRecording).toBe(false);

    await act(async () => {
      result.current.toggleRecording();
    });

    expect(result.current.isEnabled).toBe(true);
    expect(result.current.isRecording).toBe(true);
    expect(getUserMediaMock).toHaveBeenCalledTimes(1);
  });

  it("reports an error when microphone access is denied", async () => {
    getUserMediaMock.mockRejectedValue(
      Object.assign(new Error("denied"), { name: "NotAllowedError" }),
    );
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useVoiceToText({ onTranscription: vi.fn(), onError }),
    );

    await act(async () => {
      result.current.toggleRecording();
    });

    expect(result.current.isEnabled).toBe(true);
    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining("Microphone access"),
    );
    expect(result.current.isRecording).toBe(false);
  });

  it("records audio and transcribes it locally via Whisper", async () => {
    const transcriberMock = vi
      .fn()
      .mockResolvedValue({ text: "  hello world  " });
    pipelineMock.mockResolvedValue(transcriberMock);
    const onTranscription = vi.fn();
    const { result } = renderHook(() => useVoiceToText({ onTranscription }));
    const { instances } = installMediaRecorderMock();

    await act(async () => {
      result.current.toggleRecording();
    });

    expect(getUserMediaMock).toHaveBeenCalledTimes(1);
    expect(result.current.isRecording).toBe(true);
    const recorder = instances[0];
    expect(recorder.start).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.toggleRecording();
    });
    expect(recorder.stop).toHaveBeenCalledTimes(1);
    expect(result.current.isRecording).toBe(false);
    expect(result.current.isTranscribing).toBe(true);

    await act(async () => {
      recorder.onstop?.();
    });
    expect(pipelineMock).toHaveBeenCalledWith(
      "automatic-speech-recognition",
      expect.any(String),
      expect.any(Object),
    );
    expect(transcriberMock).toHaveBeenCalledTimes(1);
    expect(onTranscription).toHaveBeenCalledWith("hello world");
    expect(result.current.isTranscribing).toBe(false);
  });

  it("starts recording again after stopping once enabled", async () => {
    const { result } = renderHook(() =>
      useVoiceToText({ onTranscription: vi.fn() }),
    );
    const { instances } = installMediaRecorderMock();

    await act(async () => {
      result.current.toggleRecording(); // enable + start
      result.current.toggleRecording(); // stop
      instances[0].onstop?.();
    });
    expect(result.current.isRecording).toBe(false);

    await act(async () => {
      result.current.toggleRecording(); // start again (still enabled)
    });
    expect(getUserMediaMock).toHaveBeenCalledTimes(2);
    expect(result.current.isRecording).toBe(true);
    expect(result.current.isEnabled).toBe(true);
  });

  it("surfaces transcription errors through onError", async () => {
    const transcriberMock = vi
      .fn()
      .mockRejectedValue(new Error("decode failed"));
    pipelineMock.mockResolvedValue(transcriberMock);
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useVoiceToText({ onTranscription: vi.fn(), onError }),
    );
    const { instances } = installMediaRecorderMock();

    await act(async () => {
      result.current.toggleRecording();
      result.current.toggleRecording();
    });
    await act(async () => {
      instances[0].onstop?.();
    });

    expect(onError).toHaveBeenCalledWith("decode failed");
    expect(result.current.isTranscribing).toBe(false);
  });

  it("releases the microphone on unmount", async () => {
    const { result, unmount } = renderHook(() =>
      useVoiceToText({ onTranscription: vi.fn() }),
    );

    await act(async () => {
      result.current.toggleRecording();
    });
    expect(tracks[0].stop).not.toHaveBeenCalled();

    unmount();
    expect(tracks[0].stop).toHaveBeenCalledTimes(1);
  });

  it("survives StrictMode effect replay and disposes on final unmount", async () => {
    const { result, unmount } = renderHook(
      () => useVoiceToText({ onTranscription: vi.fn() }),
      { wrapper: StrictMode },
    );

    await act(async () => {
      result.current.toggleRecording();
    });
    expect(tracks[0].stop).not.toHaveBeenCalled();

    unmount();
    expect(tracks[0].stop).toHaveBeenCalledTimes(1);
  });
});
