import React from "react";
import { CustomTagState } from "./stateTypes";
import { OctopusStudioDbProjectInfo } from "./OctopusStudioDbProjectInfo";

interface OctopusStudioSupabaseProjectInfoProps {
  node: {
    properties: {
      state?: CustomTagState;
    };
  };
  children: React.ReactNode;
}

export function OctopusStudioSupabaseProjectInfo(
  props: OctopusStudioSupabaseProjectInfoProps,
) {
  return <OctopusStudioDbProjectInfo provider="Supabase" {...props} />;
}
