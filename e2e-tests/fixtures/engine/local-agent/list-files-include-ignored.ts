import type { LocalAgentFixture } from "../../../../testing/fake-llm-server/localAgentTypes";

export const fixture: LocalAgentFixture = {
  description: "List files including ignored .octopusStudio files",
  turns: [
    {
      text: "I'll list all files including the ignored .octopusStudio directory for you.",
      toolCalls: [
        {
          name: "list_files",
          args: {
            directory: ".octopusStudio",
            recursive: true,
            include_ignored: true,
          },
        },
      ],
    },
    {
      text: "Here are the ignored .octopusStudio files.",
    },
  ],
};
