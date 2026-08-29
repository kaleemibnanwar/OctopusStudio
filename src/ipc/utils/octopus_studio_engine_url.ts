export function getOctopusStudioEngineBaseUrl(): string {
  return (
    process.env.OCTOPUS_STUDIO_ENGINE_URL ??
    "https://engine.octopusStudio.sh/v1"
  );
}
