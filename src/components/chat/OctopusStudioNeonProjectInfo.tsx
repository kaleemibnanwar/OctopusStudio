import React from "react";
import { CustomTagState } from "./stateTypes";
import { OctopusStudioDbProjectInfo } from "./OctopusStudioDbProjectInfo";

interface OctopusStudioNeonProjectInfoProps {
  node: {
    properties: {
      state?: CustomTagState;
    };
  };
  children: React.ReactNode;
}

export function OctopusStudioNeonProjectInfo(
  props: OctopusStudioNeonProjectInfoProps,
) {
  return <OctopusStudioDbProjectInfo provider="Neon" {...props} />;
}
