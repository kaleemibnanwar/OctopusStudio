import { afterEach, describe, expect, it } from "vitest";

import { getOctopusStudioEngineBaseUrl } from "./octopus_studio_engine_url";
import { getLmStudioBaseUrl } from "./lm_studio_utils";

const originalOctopusStudioEngineUrl = process.env.OCTOPUS_STUDIO_ENGINE_URL;
const originalLmStudioUrl = process.env.LM_STUDIO_BASE_URL_FOR_TESTING;

describe("call-time model service URLs", () => {
  afterEach(() => {
    if (originalOctopusStudioEngineUrl === undefined) {
      delete process.env.OCTOPUS_STUDIO_ENGINE_URL;
    } else {
      process.env.OCTOPUS_STUDIO_ENGINE_URL = originalOctopusStudioEngineUrl;
    }
    if (originalLmStudioUrl === undefined) {
      delete process.env.LM_STUDIO_BASE_URL_FOR_TESTING;
    } else {
      process.env.LM_STUDIO_BASE_URL_FOR_TESTING = originalLmStudioUrl;
    }
  });

  it("reads OCTOPUS_STUDIO_ENGINE_URL when called", () => {
    delete process.env.OCTOPUS_STUDIO_ENGINE_URL;
    expect(getOctopusStudioEngineBaseUrl()).toBe(
      "https://engine.octopusStudio.sh/v1",
    );

    process.env.OCTOPUS_STUDIO_ENGINE_URL = "http://127.0.0.1:4321/v1";
    expect(getOctopusStudioEngineBaseUrl()).toBe("http://127.0.0.1:4321/v1");
  });

  it("reads LM_STUDIO_BASE_URL_FOR_TESTING when called", () => {
    delete process.env.LM_STUDIO_BASE_URL_FOR_TESTING;
    expect(getLmStudioBaseUrl()).toBe("http://localhost:1234");

    process.env.LM_STUDIO_BASE_URL_FOR_TESTING = "http://127.0.0.1:9876";
    expect(getLmStudioBaseUrl()).toBe("http://127.0.0.1:9876");
  });
});
