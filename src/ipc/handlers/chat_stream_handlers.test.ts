import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  getOctopusStudioWriteTags,
  getOctopusStudioRenameTags,
  getOctopusStudioAddDependencyTags,
  getOctopusStudioDeleteTags,
} from "@/ipc/utils/octopus_studio_tag_parser";

import { processFullResponseActions } from "@/ipc/processors/response_processor";
import {
  addTrackedValue,
  removeOctopusStudioTags,
  removeTrackedValue,
  setPartialResponseForStream,
  hasUnclosedOctopusStudioWrite,
  processStreamChunks,
  takePartialResponseForStream,
} from "@/ipc/handlers/chat_stream_handlers";
import type { AsyncIterableStream, TextStreamPart, ToolSet } from "ai";
import fs from "node:fs";
import path from "node:path";
import { db } from "@/db";
import { cleanFullResponse } from "@/ipc/utils/cleanFullResponse";
import { gitAdd, gitRemove, gitCommit } from "@/ipc/utils/git_utils";
import {
  OctopusStudioError,
  OctopusStudioErrorKind,
} from "@/errors/octopus_studio_error";

const MOCK_APP_PATH = "/mock/user/data/path/mock-app-path";
const appPath = (...segments: string[]) =>
  path.join(MOCK_APP_PATH, ...segments);

describe("stream invocation tracking", () => {
  it("keeps a newer invocation tracked when an older one finishes", () => {
    const trackedInvocations = new Map<number, Set<object>>();
    const olderInvocation = {};
    const newerInvocation = {};

    addTrackedValue(trackedInvocations, 42, olderInvocation);
    addTrackedValue(trackedInvocations, 42, newerInvocation);
    removeTrackedValue(trackedInvocations, 42, olderInvocation);

    expect(trackedInvocations.get(42)).toEqual(new Set([newerInvocation]));
  });

  it("keeps partial responses isolated between concurrent streams", () => {
    const olderStream = new AbortController();
    const newerStream = new AbortController();

    setPartialResponseForStream(olderStream, "older partial response");
    setPartialResponseForStream(newerStream, "newer partial response");

    expect(takePartialResponseForStream(olderStream)).toBe(
      "older partial response",
    );
    expect(takePartialResponseForStream(newerStream)).toBe(
      "newer partial response",
    );
  });
});

// Mock fs with default export
vi.mock("node:fs", async () => {
  return {
    default: {
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn(),
      existsSync: vi.fn().mockReturnValue(false), // Default to false to avoid creating temp directory
      renameSync: vi.fn(),
      realpathSync: vi.fn((filePath: string) => filePath),
      rmdirSync: vi.fn(),
      unlinkSync: vi.fn(),
      lstatSync: vi.fn().mockReturnValue({
        isDirectory: () => false,
        isSymbolicLink: () => false,
      }),
      promises: {
        readFile: vi.fn().mockResolvedValue(""),
        realpath: vi.fn(async (filePath: string) => filePath),
        lstat: vi.fn(),
      },
    },
    existsSync: vi.fn().mockReturnValue(false), // Also mock the named export
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    renameSync: vi.fn(),
    realpathSync: vi.fn((filePath: string) => filePath),
    rmdirSync: vi.fn(),
    unlinkSync: vi.fn(),
    lstatSync: vi.fn().mockReturnValue({
      isDirectory: () => false,
      isSymbolicLink: () => false,
    }),
    promises: {
      readFile: vi.fn().mockResolvedValue(""),
      realpath: vi.fn(async (filePath: string) => filePath),
      lstat: vi.fn(),
    },
  };
});

// Mock Git utils
vi.mock("@/ipc/utils/git_utils", () => ({
  gitAdd: vi.fn(),
  gitCommit: vi.fn(),
  gitRemove: vi.fn(),
  gitRenameBranch: vi.fn(),
  gitCurrentBranch: vi.fn(),
  gitLog: vi.fn(),
  gitInit: vi.fn(),
  gitPush: vi.fn(),
  gitSetRemoteUrl: vi.fn(),
  gitStatus: vi.fn().mockResolvedValue([]),
  getGitUncommittedFiles: vi.fn().mockResolvedValue([]),
  hasStagedChanges: vi.fn().mockResolvedValue(true),
}));

// Mock paths module to control getOctopusStudioAppPath
vi.mock("@/paths/paths", () => ({
  getOctopusStudioAppPath: vi.fn().mockImplementation((appPath) => {
    return `/mock/user/data/path/${appPath}`;
  }),
  getUserDataPath: vi.fn().mockReturnValue("/mock/user/data/path"),
}));

// Mock db
vi.mock("@/db", () => ({
  db: {
    query: {
      chats: {
        findFirst: vi.fn(),
      },
      messages: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    })),
  },
}));

describe("processStreamChunks", () => {
  it("replaces partial output with an inline warning for Fable refusals", async () => {
    async function* refusalParts(): AsyncGenerator<TextStreamPart<ToolSet>> {
      yield {
        type: "text-delta",
        id: "text-1",
        text: "Partial response that must not be shown",
      };
      yield {
        type: "finish",
        finishReason: "content-filter",
        rawFinishReason: "refusal",
        totalUsage: {
          inputTokens: 10,
          inputTokenDetails: {
            noCacheTokens: 10,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
          },
          outputTokens: 5,
          outputTokenDetails: {
            textTokens: 5,
            reasoningTokens: 0,
          },
          totalTokens: 15,
        },
      };
      yield {
        type: "text-delta",
        id: "text-after-finish",
        text: "Spurious output after finish",
      };
    }

    const updates: string[] = [];
    const result = await processStreamChunks({
      fullStream: refusalParts() as unknown as AsyncIterableStream<
        TextStreamPart<ToolSet>
      >,
      fullResponse: "Existing response.\n",
      abortController: new AbortController(),
      chatId: 1,
      processResponseChunkUpdate: async ({ fullResponse }) => {
        updates.push(fullResponse);
        return fullResponse;
      },
    });

    expect(result.fullResponse).not.toContain("Partial response");
    expect(result.fullResponse).not.toContain("Spurious output");
    expect(result.fullResponse).toContain("Existing response.");
    expect(result.fullResponse).toContain(
      '<octopus-studio-output type="warning" message="Model refused to respond for safety reasons">',
    );
    expect(result.incrementalResponse).toContain("<octopus-studio-output");
    expect(result.modelRefused).toBe(true);
    expect(updates.at(-1)).toBe(result.fullResponse);
  });

  it("does not label other content filters as Fable refusals", async () => {
    async function* filteredParts(): AsyncGenerator<TextStreamPart<ToolSet>> {
      yield {
        type: "finish",
        finishReason: "content-filter",
        rawFinishReason: "content_filter",
        totalUsage: {
          inputTokens: 10,
          inputTokenDetails: {
            noCacheTokens: 10,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
          },
          outputTokens: 0,
          outputTokenDetails: {
            textTokens: 0,
            reasoningTokens: 0,
          },
          totalTokens: 10,
        },
      };
    }

    const result = await processStreamChunks({
      fullStream: filteredParts() as unknown as AsyncIterableStream<
        TextStreamPart<ToolSet>
      >,
      fullResponse: "Existing response.",
      abortController: new AbortController(),
      chatId: 1,
      processResponseChunkUpdate: async ({ fullResponse }) => fullResponse,
    });

    expect(result.fullResponse).toBe("Existing response.");
    expect(result.incrementalResponse).toBe("");
    expect(result.modelRefused).toBe(false);
  });

  it("closes a thinking block left open when the stream ends mid-reasoning", async () => {
    async function* reasoningOnlyParts(): AsyncGenerator<
      TextStreamPart<ToolSet>
    > {
      yield {
        type: "reasoning-delta",
        id: "reasoning-1",
        text: "Thinking about the answer...",
      };
      // Stream ends here without a text-delta or reasoning-end part.
    }

    const result = await processStreamChunks({
      fullStream: reasoningOnlyParts() as unknown as AsyncIterableStream<
        TextStreamPart<ToolSet>
      >,
      fullResponse: "",
      abortController: new AbortController(),
      chatId: 1,
      processResponseChunkUpdate: async ({ fullResponse }) => fullResponse,
    });

    expect(result.fullResponse).toBe(
      "<think>Thinking about the answer...</think>",
    );
  });
});

describe("getOctopusStudioAddDependencyTags", () => {
  it("should return an empty array when no octopus-studio-add-dependency tags are found", () => {
    const result = getOctopusStudioAddDependencyTags(
      "No octopus-studio-add-dependency tags here",
    );
    expect(result).toEqual([]);
  });

  it("should return an array of octopus-studio-add-dependency tags", () => {
    const result = getOctopusStudioAddDependencyTags(
      `<octopus-studio-add-dependency packages="uuid"></octopus-studio-add-dependency>`,
    );
    expect(result).toEqual(["uuid"]);
  });

  it("should return all the packages in the octopus-studio-add-dependency tags", () => {
    const result = getOctopusStudioAddDependencyTags(
      `<octopus-studio-add-dependency packages="pkg1 pkg2"></octopus-studio-add-dependency>`,
    );
    expect(result).toEqual(["pkg1", "pkg2"]);
  });

  it("should return all the packages in the octopus-studio-add-dependency tags", () => {
    const result = getOctopusStudioAddDependencyTags(
      `txt before<octopus-studio-add-dependency packages="pkg1 pkg2"></octopus-studio-add-dependency>text after`,
    );
    expect(result).toEqual(["pkg1", "pkg2"]);
  });

  it("should return all the packages in multiple octopus-studio-add-dependency tags", () => {
    const result = getOctopusStudioAddDependencyTags(
      `txt before<octopus-studio-add-dependency packages="pkg1 pkg2"></octopus-studio-add-dependency>txt between<octopus-studio-add-dependency packages="pkg3"></octopus-studio-add-dependency>text after`,
    );
    expect(result).toEqual(["pkg1", "pkg2", "pkg3"]);
  });

  it("preserves scoped version specs and ignores extra whitespace", () => {
    const result = getOctopusStudioAddDependencyTags(
      `<octopus-studio-add-dependency packages="  foo@latest   @scope/bar@^2.0.0 "></octopus-studio-add-dependency>`,
    );
    expect(result).toEqual(["foo@latest", "@scope/bar@^2.0.0"]);
  });
});
describe("getOctopusStudioWriteTags", () => {
  it("should return an empty array when no octopus-studio-write tags are found", () => {
    const result = getOctopusStudioWriteTags(
      "No octopus-studio-write tags here",
    );
    expect(result).toEqual([]);
  });

  it("should return a octopus-studio-write tag", () => {
    const result =
      getOctopusStudioWriteTags(`<octopus-studio-write path="src/components/TodoItem.tsx" description="Creating a component for individual todo items">
import React from "react";
console.log("TodoItem");
</octopus-studio-write>`);
    expect(result).toEqual([
      {
        path: "src/components/TodoItem.tsx",
        description: "Creating a component for individual todo items",
        content: `import React from "react";
console.log("TodoItem");`,
      },
    ]);
  });

  it("should strip out code fence (if needed) from a octopus-studio-write tag", () => {
    const result =
      getOctopusStudioWriteTags(`<octopus-studio-write path="src/components/TodoItem.tsx" description="Creating a component for individual todo items">
\`\`\`tsx
import React from "react";
console.log("TodoItem");
\`\`\`
</octopus-studio-write>
`);
    expect(result).toEqual([
      {
        path: "src/components/TodoItem.tsx",
        description: "Creating a component for individual todo items",
        content: `import React from "react";
console.log("TodoItem");`,
      },
    ]);
  });

  it("should handle missing description", () => {
    const result = getOctopusStudioWriteTags(`
      <octopus-studio-write path="src/pages/locations/neighborhoods/louisville/Highlands.tsx">
import React from 'react';
</octopus-studio-write>
    `);
    expect(result).toEqual([
      {
        path: "src/pages/locations/neighborhoods/louisville/Highlands.tsx",
        description: undefined,
        content: `import React from 'react';`,
      },
    ]);
  });

  it("should handle extra space", () => {
    const result = getOctopusStudioWriteTags(
      cleanFullResponse(`
      <octopus-studio-write path="src/pages/locations/neighborhoods/louisville/Highlands.tsx" description="Updating Highlands neighborhood page to use <a> tags." >
import React from 'react';
</octopus-studio-write>
    `),
    );
    expect(result).toEqual([
      {
        path: "src/pages/locations/neighborhoods/louisville/Highlands.tsx",
        description: "Updating Highlands neighborhood page to use ＜a＞ tags.",
        content: `import React from 'react';`,
      },
    ]);
  });

  it("should handle nested tags", () => {
    const result = getOctopusStudioWriteTags(
      cleanFullResponse(`
      BEFORE TAG
  <octopus-studio-write path="src/pages/locations/neighborhoods/louisville/Highlands.tsx" description="Updating Highlands neighborhood page to use <a> tags.">
import React from 'react';
</octopus-studio-write>
AFTER TAG
    `),
    );
    expect(result).toEqual([
      {
        path: "src/pages/locations/neighborhoods/louisville/Highlands.tsx",
        description: "Updating Highlands neighborhood page to use ＜a＞ tags.",
        content: `import React from 'react';`,
      },
    ]);
  });

  it("should handle nested tags after preprocessing", () => {
    // Simulate the preprocessing step that cleanFullResponse would do
    const inputWithNestedTags = `
      BEFORE TAG
  <octopus-studio-write path="src/pages/locations/neighborhoods/louisville/Highlands.tsx" description="Updating Highlands neighborhood page to use <a> tags.">
import React from 'react';
</octopus-studio-write>
AFTER TAG
    `;

    const cleanedInput = cleanFullResponse(inputWithNestedTags);

    const result = getOctopusStudioWriteTags(cleanedInput);
    expect(result).toEqual([
      {
        path: "src/pages/locations/neighborhoods/louisville/Highlands.tsx",
        description: "Updating Highlands neighborhood page to use ＜a＞ tags.",
        content: `import React from 'react';`,
      },
    ]);
  });

  it("should handle multiple nested tags after preprocessing", () => {
    const inputWithMultipleNestedTags = `<octopus-studio-write path="src/file.tsx" description="Testing <div> and <span> and <a> tags.">content</octopus-studio-write>`;

    // This simulates what cleanFullResponse should do
    const cleanedInput = cleanFullResponse(inputWithMultipleNestedTags);
    const result = getOctopusStudioWriteTags(cleanedInput);
    expect(result).toEqual([
      {
        path: "src/file.tsx",
        description: "Testing ＜div＞ and ＜span＞ and ＜a＞ tags.",
        content: `content`,
      },
    ]);
  });

  it("should handle nested tags in multiple attributes", () => {
    const inputWithNestedInMultipleAttrs = `<octopus-studio-write path="src/<component>.tsx" description="Testing <div> tags.">content</octopus-studio-write>`;

    // This simulates what cleanFullResponse should do
    const cleanedInput = cleanFullResponse(inputWithNestedInMultipleAttrs);

    const result = getOctopusStudioWriteTags(cleanedInput);
    expect(result).toEqual([
      {
        path: "src/＜component＞.tsx",
        description: "Testing ＜div＞ tags.",
        content: `content`,
      },
    ]);
  });

  it("should return an array of octopus-studio-write tags", () => {
    const result = getOctopusStudioWriteTags(
      `I'll create a simple todo list app using React, TypeScript, and shadcn/ui components. Let's get started!

First, I'll create the necessary files for our todo list application:

<octopus-studio-write path="src/types/todo.ts" description="Creating types for our todo items">
export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}
</octopus-studio-write>

<octopus-studio-write path="src/components/TodoItem.tsx" description="Creating a component for individual todo items">
import React from "react";
import { Trash2, Check, X } from "lucide-react";
import { Todo } from "../types/todo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ todo, onToggle, onDelete }) => {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg mb-2 bg-white shadow-sm">
      <div className="flex items-center gap-3 flex-1">
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-6 w-6 rounded-full",
            todo.completed && "bg-green-100 text-green-600"
          )}
          onClick={() => onToggle(todo.id)}
        >
          {todo.completed ? (
            <Check className="h-4 w-4" />
          ) : (
            <X className="h-4 w-4 opacity-0" />
          )}
        </Button>
        <span
          className={cn(
            "text-sm",
            todo.completed && "line-through text-gray-500"
          )}
        >
          {todo.text}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
        onClick={() => onDelete(todo.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default TodoItem;
</octopus-studio-write>

<octopus-studio-write path="src/components/TodoForm.tsx" description="Creating a form component for adding new todos">
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle } from "lucide-react";

interface TodoFormProps {
  onAddTodo: (text: string) => void;
}

const TodoForm: React.FC<TodoFormProps> = ({ onAddTodo }) => {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAddTodo(text.trim());
      setText("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
      <Input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a new task..."
        className="flex-1"
      />
      <Button type="submit" disabled={!text.trim()}>
        <PlusCircle className="h-4 w-4 mr-2" />
        Add
      </Button>
    </form>
  );
};

export default TodoForm;
</octopus-studio-write>

<octopus-studio-write path="src/components/TodoList.tsx" description="Creating the main todo list component">
import React from "react";
import { Todo } from "../types/todo";
import TodoItem from "./TodoItem";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TodoListProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const TodoList: React.FC<TodoListProps> = ({ todos, onToggle, onDelete }) => {
  if (todos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No tasks yet. Add one above!
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] rounded-md border p-4">
      <div className="space-y-2">
        {todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </div>
    </ScrollArea>
  );
};

export default TodoList;
</octopus-studio-write>

<octopus-studio-write path="src/components/TodoStats.tsx" description="Creating a component to show todo statistics">
import React from "react";
import { Todo } from "../types/todo";
import { Card, CardContent } from "@/components/ui/card";

interface TodoStatsProps {
  todos: Todo[];
}

const TodoStats: React.FC<TodoStatsProps> = ({ todos }) => {
  const total = todos.length;
  const completed = todos.filter((todo) => todo.completed).length;
  const pending = total - completed;
  const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Total Tasks</p>
            <p className="text-3xl font-bold">{total}</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Completed</p>
            <p className="text-3xl font-bold text-green-600">{completed}</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Pending</p>
            <p className="text-3xl font-bold text-amber-600">{pending}</p>
          </div>
        </CardContent>
      </Card>
      
      <Card className="md:col-span-3">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{percentComplete}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-300"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TodoStats;
</octopus-studio-write>

<octopus-studio-write path="src/pages/Index.tsx" description="Creating the main page for our todo app">
import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Todo } from "../types/todo";
import TodoForm from "../components/TodoForm";
import TodoList from "../components/TodoList";
import TodoStats from "../components/TodoStats";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";

const Index: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const savedTodos = localStorage.getItem("todos");
    if (savedTodos) {
      try {
        // Parse the saved todos and convert string dates back to Date objects
        return JSON.parse(savedTodos).map((todo: any) => ({
          ...todo,
          createdAt: new Date(todo.createdAt)
        }));
      } catch (e) {
        console.error("Failed to parse saved todos", e);
        return [];
      }
    }
    return [];
  });

  const { toast } = useToast();

  // Save todos to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  const handleAddTodo = (text: string) => {
    const newTodo: Todo = {
      id: uuidv4(),
      text,
      completed: false,
      createdAt: new Date()
    };
    
    setTodos([...todos, newTodo]);
    toast({
      title: "Task added",
      description: "Your new task has been added successfully.",
    });
  };

  const handleToggleTodo = (id: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
    
    const todo = todos.find(t => t.id === id);
    if (todo) {
      toast({
        title: todo.completed ? "Task marked as incomplete" : "Task completed",
        description: todo.text,
      });
    }
  };

  const handleDeleteTodo = (id: string) => {
    const todoToDelete = todos.find(todo => todo.id === id);
    setTodos(todos.filter((todo) => todo.id !== id));
    
    if (todoToDelete) {
      toast({
        title: "Task deleted",
        description: todoToDelete.text,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2 text-center">Todo List</h1>
      <p className="text-gray-500 mb-8 text-center">
        Keep track of your tasks and stay organized
      </p>
      
      <TodoStats todos={todos} />
      <TodoForm onAddTodo={handleAddTodo} />
      <TodoList
        todos={todos}
        onToggle={handleToggleTodo}
        onDelete={handleDeleteTodo}
      />
      <Toaster />
    </div>
  );
};

export default Index;
</octopus-studio-write>

<octopus-studio-add-dependency packages="uuid"></octopus-studio-add-dependency>

<octopus-studio-write path="src/types/uuid.d.ts" description="Adding type definitions for uuid">
declare module 'uuid' {
  export function v4(): string;
}
</octopus-studio-write>

I've created a complete todo list application with the ability to add, complete, and delete tasks. The app includes statistics and uses local storage to persist data.`,
    );
    expect(result.length).toEqual(7);
  });
});

describe("getOctopusStudioRenameTags", () => {
  it("should return an empty array when no octopus-studio-rename tags are found", () => {
    const result = getOctopusStudioRenameTags(
      "No octopus-studio-rename tags here",
    );
    expect(result).toEqual([]);
  });

  it("should return an array of octopus-studio-rename tags", () => {
    const result = getOctopusStudioRenameTags(
      `<octopus-studio-rename from="src/components/UserProfile.jsx" to="src/components/ProfileCard.jsx"></octopus-studio-rename>
      <octopus-studio-rename from="src/utils/helpers.js" to="src/utils/utils.js"></octopus-studio-rename>`,
    );
    expect(result).toEqual([
      {
        from: "src/components/UserProfile.jsx",
        to: "src/components/ProfileCard.jsx",
      },
      { from: "src/utils/helpers.js", to: "src/utils/utils.js" },
    ]);
  });
});

describe("getOctopusStudioDeleteTags", () => {
  it("should return an empty array when no octopus-studio-delete tags are found", () => {
    const result = getOctopusStudioDeleteTags(
      "No octopus-studio-delete tags here",
    );
    expect(result).toEqual([]);
  });

  it("should return an array of octopus-studio-delete paths", () => {
    const result = getOctopusStudioDeleteTags(
      `<octopus-studio-delete path="src/components/Analytics.jsx"></octopus-studio-delete>
      <octopus-studio-delete path="src/utils/unused.js"></octopus-studio-delete>`,
    );
    expect(result).toEqual([
      "src/components/Analytics.jsx",
      "src/utils/unused.js",
    ]);
  });
});

describe("processFullResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock db query response
    vi.mocked(db.query.chats.findFirst).mockResolvedValue({
      id: 1,
      appId: 1,
      title: "Test Chat",
      createdAt: new Date(),
      app: {
        id: 1,
        name: "Mock App",
        path: "mock-app-path",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      messages: [],
    } as any);

    vi.mocked(db.query.messages.findFirst).mockResolvedValue({
      id: 1,
      chatId: 1,
      role: "assistant",
      content: "some content",
      createdAt: new Date(),
      approvalState: null,
      commitHash: null,
    } as any);

    // Default mock for existsSync to return true
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.realpathSync).mockImplementation((filePath) =>
      String(filePath),
    );
    vi.mocked(fs.promises.realpath).mockImplementation(async (filePath) =>
      String(filePath),
    );
    vi.mocked(fs.lstatSync).mockReturnValue({
      isDirectory: () => false,
      isSymbolicLink: () => false,
    } as any);
  });

  it("should return empty object when no octopus-studio-write tags are found", async () => {
    const result = await processFullResponseActions(
      "No octopus-studio-write tags here",
      1,
      {
        chatSummary: undefined,
        messageId: 1,
      },
    );
    expect(result).toEqual({
      updatedFiles: false,
      extraFiles: undefined,
      extraFilesError: undefined,
    });
    expect(fs.mkdirSync).not.toHaveBeenCalled();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("should process octopus-studio-write tags and create files", async () => {
    // Set up fs mocks to succeed
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);

    const response = `<octopus-studio-write path="src/file1.js">console.log('Hello');</octopus-studio-write>`;

    const result = await processFullResponseActions(response, 1, {
      chatSummary: undefined,
      messageId: 1,
    });

    expect(fs.mkdirSync).toHaveBeenCalledWith(appPath("src"), {
      recursive: true,
    });
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      appPath("src/file1.js"),
      "console.log('Hello');",
    );
    expect(gitAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        filepath: "src/file1.js",
      }),
    );
    expect(gitCommit).toHaveBeenCalled();
    expect(result).toEqual({ updatedFiles: true });
  });

  it("should handle file system errors gracefully", async () => {
    // Set up the mock to throw an error on mkdirSync
    vi.mocked(fs.mkdirSync).mockImplementationOnce(() => {
      throw new OctopusStudioError(
        "Mock filesystem error",
        OctopusStudioErrorKind.Internal,
      );
    });

    const response = `<octopus-studio-write path="src/error-file.js">This will fail</octopus-studio-write>`;

    const result = await processFullResponseActions(response, 1, {
      chatSummary: undefined,
      messageId: 1,
    });

    expect(result).toHaveProperty("error");
    expect(result.error).toContain("Mock filesystem error");
  });

  it("should process multiple octopus-studio-write tags and commit all files", async () => {
    // Clear previous mock calls
    vi.clearAllMocks();

    // Set up fs mocks to succeed
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);

    const response = `
    <octopus-studio-write path="src/file1.js">console.log('First file');</octopus-studio-write>
    <octopus-studio-write path="src/utils/file2.js">export const add = (a, b) => a + b;</octopus-studio-write>
    <octopus-studio-write path="src/components/Button.tsx">
    import React from 'react';
    export const Button = ({ children }) => <button>{children}</button>;
    </octopus-studio-write>
    `;

    const result = await processFullResponseActions(response, 1, {
      chatSummary: undefined,
      messageId: 1,
    });

    // Check that directories were created for each file path
    expect(fs.mkdirSync).toHaveBeenCalledWith(appPath("src"), {
      recursive: true,
    });
    expect(fs.mkdirSync).toHaveBeenCalledWith(appPath("src/utils"), {
      recursive: true,
    });
    expect(fs.mkdirSync).toHaveBeenCalledWith(appPath("src/components"), {
      recursive: true,
    });

    // Using toHaveBeenNthCalledWith to check each specific call
    expect(fs.writeFileSync).toHaveBeenNthCalledWith(
      1,
      appPath("src/file1.js"),
      "console.log('First file');",
    );
    expect(fs.writeFileSync).toHaveBeenNthCalledWith(
      2,
      appPath("src/utils/file2.js"),
      "export const add = (a, b) => a + b;",
    );
    expect(fs.writeFileSync).toHaveBeenNthCalledWith(
      3,
      appPath("src/components/Button.tsx"),
      "import React from 'react';\n    export const Button = ({ children }) => <button>{children}</button>;",
    );

    // Verify git operations were called for each file
    expect(gitAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        filepath: "src/file1.js",
      }),
    );
    expect(gitAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        filepath: "src/utils/file2.js",
      }),
    );
    expect(gitAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        filepath: "src/components/Button.tsx",
      }),
    );

    // Verify commit was called once after all files were added
    expect(gitCommit).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ updatedFiles: true });
  });

  it("should process octopus-studio-rename tags and rename files", async () => {
    // Set up fs mocks to succeed
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.renameSync).mockImplementation(() => undefined);

    const response = `<octopus-studio-rename from="src/components/OldComponent.jsx" to="src/components/NewComponent.jsx"></octopus-studio-rename>`;

    const result = await processFullResponseActions(response, 1, {
      chatSummary: undefined,
      messageId: 1,
    });

    expect(fs.mkdirSync).toHaveBeenCalledWith(appPath("src/components"), {
      recursive: true,
    });
    expect(fs.renameSync).toHaveBeenCalledWith(
      appPath("src/components/OldComponent.jsx"),
      appPath("src/components/NewComponent.jsx"),
    );
    expect(gitAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        filepath: "src/components/NewComponent.jsx",
      }),
    );
    expect(gitRemove).toHaveBeenCalledWith(
      expect.objectContaining({
        filepath: "src/components/OldComponent.jsx",
      }),
    );
    expect(gitCommit).toHaveBeenCalled();
    expect(result).toEqual({ updatedFiles: true });
  });

  it("should handle non-existent files during rename gracefully", async () => {
    // Set up the mock to return false for existsSync
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const response = `<octopus-studio-rename from="src/components/NonExistent.jsx" to="src/components/NewFile.jsx"></octopus-studio-rename>`;

    const result = await processFullResponseActions(response, 1, {
      chatSummary: undefined,
      messageId: 1,
    });

    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.renameSync).not.toHaveBeenCalled();
    expect(gitCommit).not.toHaveBeenCalled();
    expect(result).toEqual({
      updatedFiles: false,
      extraFiles: undefined,
      extraFilesError: undefined,
    });
  });

  it("should process octopus-studio-delete tags and delete files", async () => {
    // Set up fs mocks to succeed
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.unlinkSync).mockImplementation(() => undefined);

    const response = `<octopus-studio-delete path="src/components/Unused.jsx"></octopus-studio-delete>`;

    const result = await processFullResponseActions(response, 1, {
      chatSummary: undefined,
      messageId: 1,
    });

    expect(fs.unlinkSync).toHaveBeenCalledWith(
      appPath("src/components/Unused.jsx"),
    );
    expect(gitRemove).toHaveBeenCalledWith(
      expect.objectContaining({
        filepath: "src/components/Unused.jsx",
      }),
    );
    expect(gitCommit).toHaveBeenCalled();
    expect(result).toEqual({ updatedFiles: true });
  });

  it.each([
    ".",
    "./",
    ".\\",
    "foo/..",
    "foo\\..",
    "../mock-app-path",
    "..\\mock-app-path",
    "../../path/mock-app-path",
    "../../path/MOCK-APP-PATH",
  ])(
    "should reject project-root-equivalent delete path %s before deleting",
    async (deletePath) => {
      const response = `<octopus-studio-delete path="${deletePath}"></octopus-studio-delete>`;

      const result = await processFullResponseActions(response, 1, {
        chatSummary: undefined,
        messageId: 1,
      });

      expect(result.error).toContain("Refusing to delete project root");
      expect(fs.existsSync).not.toHaveBeenCalledWith(MOCK_APP_PATH);
      expect(fs.unlinkSync).not.toHaveBeenCalled();
      expect(fs.rmdirSync).not.toHaveBeenCalled();
      expect(gitRemove).not.toHaveBeenCalled();
      expect(gitCommit).not.toHaveBeenCalled();
    },
  );

  it("should preflight all deletes before applying any of them", async () => {
    vi.mocked(fs.existsSync).mockImplementation(
      (filePath) => filePath === appPath("src/keep.jsx"),
    );

    const response = `
      <octopus-studio-write path="src/new.jsx">export default {};</octopus-studio-write>
      <octopus-studio-rename from="src/old.jsx" to="src/renamed.jsx"></octopus-studio-rename>
      <octopus-studio-delete path="src/keep.jsx"></octopus-studio-delete>
      <octopus-studio-delete path="foo/.."></octopus-studio-delete>
    `;

    const result = await processFullResponseActions(response, 1, {
      chatSummary: undefined,
      messageId: 1,
    });

    expect(result.error).toBe(
      'Refusing to delete project root for path: "foo/.." No actions from this response were applied. Skipped: 1 write, 1 rename, 2 deletes.',
    );
    expect(fs.lstatSync).not.toHaveBeenCalled();
    expect(fs.unlinkSync).not.toHaveBeenCalled();
    expect(fs.rmdirSync).not.toHaveBeenCalled();
    expect(fs.existsSync).not.toHaveBeenCalled();
    expect(gitRemove).not.toHaveBeenCalled();
  });

  it.each(["../sibling", "..\\sibling"])(
    "should reject sibling escape path %s without deleting",
    async (deletePath) => {
      const result = await processFullResponseActions(
        `<octopus-studio-delete path="${deletePath}"></octopus-studio-delete>`,
        1,
        { chatSummary: undefined, messageId: 1 },
      );

      expect(result.error).toContain("Unsafe path");
      expect(fs.unlinkSync).not.toHaveBeenCalled();
      expect(fs.rmdirSync).not.toHaveBeenCalled();
      expect(gitRemove).not.toHaveBeenCalled();
    },
  );

  it("unlinks a slash-terminated final symlink instead of following it", async () => {
    vi.mocked(fs.lstatSync).mockReturnValue({
      isDirectory: () => false,
      isSymbolicLink: () => true,
    } as any);

    const result = await processFullResponseActions(
      `<octopus-studio-delete path="self/"></octopus-studio-delete>`,
      1,
      { chatSummary: undefined, messageId: 1 },
    );

    expect(result).toEqual({ updatedFiles: true });
    expect(fs.unlinkSync).toHaveBeenCalledWith(appPath("self"));
    expect(fs.rmdirSync).not.toHaveBeenCalled();
    expect(gitRemove).toHaveBeenCalledWith({
      path: MOCK_APP_PATH,
      filepath: "self",
    });
  });

  it("should handle non-existent files during delete gracefully", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.lstatSync).mockImplementation(() => {
      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    });

    const response = `<octopus-studio-delete path="src/components/NonExistent.jsx"></octopus-studio-delete>`;

    const result = await processFullResponseActions(response, 1, {
      chatSummary: undefined,
      messageId: 1,
    });

    expect(fs.unlinkSync).not.toHaveBeenCalled();
    expect(gitRemove).not.toHaveBeenCalled();
    expect(gitCommit).not.toHaveBeenCalled();
    expect(result).toEqual({
      updatedFiles: false,
      extraFiles: undefined,
      extraFilesError: undefined,
    });
  });

  it("should process mixed operations (write, rename, delete) in one response", async () => {
    // Set up fs mocks to succeed
    vi.mocked(fs.existsSync).mockImplementation(
      (filePath) => String(filePath) !== appPath("pnpm-workspace.yaml"),
    );
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
    vi.mocked(fs.renameSync).mockImplementation(() => undefined);
    vi.mocked(fs.unlinkSync).mockImplementation(() => undefined);

    const response = `
    <octopus-studio-write path="src/components/NewComponent.jsx">import React from 'react'; export default () => <div>New</div>;</octopus-studio-write>
    <octopus-studio-rename from="src/components/OldComponent.jsx" to="src/components/RenamedComponent.jsx"></octopus-studio-rename>
    <octopus-studio-delete path="src/components/Unused.jsx"></octopus-studio-delete>
    `;

    const result = await processFullResponseActions(response, 1, {
      chatSummary: undefined,
      messageId: 1,
    });

    // Check write operation happened
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      appPath("src/components/NewComponent.jsx"),
      "import React from 'react'; export default () => <div>New</div>;",
    );

    // Check rename operation happened
    expect(fs.renameSync).toHaveBeenCalledWith(
      appPath("src/components/OldComponent.jsx"),
      appPath("src/components/RenamedComponent.jsx"),
    );

    // Check delete operation happened
    expect(fs.unlinkSync).toHaveBeenCalledWith(
      appPath("src/components/Unused.jsx"),
    );

    // Check git operations
    expect(gitAdd).toHaveBeenCalledTimes(2); // For the write and rename
    expect(gitRemove).toHaveBeenCalledTimes(2); // For the rename and delete

    // Check the commit message includes all operations
    expect(gitCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          "wrote 1 file(s), renamed 1 file(s), deleted 1 file(s)",
        ),
      }),
    );

    expect(result).toEqual({ updatedFiles: true });
  });

  it("should stage pnpm-workspace.yaml when it exists alongside response changes", async () => {
    vi.mocked(fs.existsSync).mockImplementation(
      (filePath) => String(filePath) === appPath("pnpm-workspace.yaml"),
    );
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);

    const response = `<octopus-studio-write path="src/file1.js">console.log('Hello');</octopus-studio-write>`;

    const result = await processFullResponseActions(response, 1, {
      chatSummary: undefined,
      messageId: 1,
    });

    expect(gitAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        filepath: "src/file1.js",
      }),
    );
    expect(gitAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        filepath: "pnpm-workspace.yaml",
      }),
    );
    expect(result).toEqual({ updatedFiles: true });
  });
});

describe("removeOctopusStudioTags", () => {
  it("should return empty string when input is empty", () => {
    const result = removeOctopusStudioTags("");
    expect(result).toBe("");
  });

  it("should return the same text when no octopus-studio tags are present", () => {
    const text = "This is a regular text without any octopus-studio tags.";
    const result = removeOctopusStudioTags(text);
    expect(result).toBe(text);
  });

  it("should remove a single octopus-studio-write tag", () => {
    const text = `Before text <octopus-studio-write path="src/file.js">console.log('hello');</octopus-studio-write> After text`;
    const result = removeOctopusStudioTags(text);
    expect(result).toBe("Before text  After text");
  });

  it("should remove a single octopus-studio-delete tag", () => {
    const text = `Before text <octopus-studio-delete path="src/file.js"></octopus-studio-delete> After text`;
    const result = removeOctopusStudioTags(text);
    expect(result).toBe("Before text  After text");
  });

  it("should remove a single octopus-studio-rename tag", () => {
    const text = `Before text <octopus-studio-rename from="old.js" to="new.js"></octopus-studio-rename> After text`;
    const result = removeOctopusStudioTags(text);
    expect(result).toBe("Before text  After text");
  });

  it("should remove multiple different octopus-studio tags", () => {
    const text = `Start <octopus-studio-write path="file1.js">code here</octopus-studio-write> middle <octopus-studio-delete path="file2.js"></octopus-studio-delete> end <octopus-studio-rename from="old.js" to="new.js"></octopus-studio-rename> finish`;
    const result = removeOctopusStudioTags(text);
    expect(result).toBe("Start  middle  end  finish");
  });

  it("should remove octopus-studio tags with multiline content", () => {
    const text = `Before
<octopus-studio-write path="src/component.tsx" description="A React component">
import React from 'react';

const Component = () => {
  return <div>Hello World</div>;
};

export default Component;
</octopus-studio-write>
After`;
    const result = removeOctopusStudioTags(text);
    expect(result).toBe("Before\n\nAfter");
  });

  it("should handle octopus-studio tags with complex attributes", () => {
    const text = `Text <octopus-studio-write path="src/file.js" description="Complex component with quotes" version="1.0">const x = "hello world";</octopus-studio-write> more text`;
    const result = removeOctopusStudioTags(text);
    expect(result).toBe("Text  more text");
  });

  it("should remove octopus-studio tags and trim whitespace", () => {
    const text = `  <octopus-studio-write path="file.js">code</octopus-studio-write>  `;
    const result = removeOctopusStudioTags(text);
    expect(result).toBe("");
  });

  it("should handle nested content that looks like tags", () => {
    const text = `<octopus-studio-write path="file.js">
const html = '<div>Hello</div>';
const component = <Component />;
</octopus-studio-write>`;
    const result = removeOctopusStudioTags(text);
    expect(result).toBe("");
  });

  it("should handle self-closing octopus-studio tags", () => {
    const text = `Before <octopus-studio-delete path="file.js" /> After`;
    const result = removeOctopusStudioTags(text);
    expect(result).toBe(
      'Before <octopus-studio-delete path="file.js" /> After',
    );
  });

  it("should handle malformed octopus-studio tags gracefully", () => {
    const text = `Before <octopus-studio-write path="file.js">unclosed tag After`;
    const result = removeOctopusStudioTags(text);
    expect(result).toBe(
      'Before <octopus-studio-write path="file.js">unclosed tag After',
    );
  });

  it("should handle octopus-studio tags with special characters in content", () => {
    const text = `<octopus-studio-write path="file.js">
const regex = /<div[^>]*>.*?</div>/g;
const special = "Special chars: @#$%^&*()[]{}|\\";
</octopus-studio-write>`;
    const result = removeOctopusStudioTags(text);
    expect(result).toBe("");
  });

  it("should handle multiple octopus-studio tags of the same type", () => {
    const text = `<octopus-studio-write path="file1.js">code1</octopus-studio-write> between <octopus-studio-write path="file2.js">code2</octopus-studio-write>`;
    const result = removeOctopusStudioTags(text);
    expect(result).toBe("between");
  });

  it("should handle octopus-studio tags with custom tag names", () => {
    const text = `Before <octopus-studio-custom-action param="value">content</octopus-studio-custom-action> After`;
    const result = removeOctopusStudioTags(text);
    expect(result).toBe("Before  After");
  });
});

describe("hasUnclosedOctopusStudioWrite", () => {
  it("should return false when there are no octopus-studio-write tags", () => {
    const text = "This is just regular text without any octopus-studio tags.";
    const result = hasUnclosedOctopusStudioWrite(text);
    expect(result).toBe(false);
  });

  it("should return false when octopus-studio-write tag is properly closed", () => {
    const text = `<octopus-studio-write path="src/file.js">console.log('hello');</octopus-studio-write>`;
    const result = hasUnclosedOctopusStudioWrite(text);
    expect(result).toBe(false);
  });

  it("should return true when octopus-studio-write tag is not closed", () => {
    const text = `<octopus-studio-write path="src/file.js">console.log('hello');`;
    const result = hasUnclosedOctopusStudioWrite(text);
    expect(result).toBe(true);
  });

  it("should return false when octopus-studio-write tag with attributes is properly closed", () => {
    const text = `<octopus-studio-write path="src/file.js" description="A test file">console.log('hello');</octopus-studio-write>`;
    const result = hasUnclosedOctopusStudioWrite(text);
    expect(result).toBe(false);
  });

  it("should return true when octopus-studio-write tag with attributes is not closed", () => {
    const text = `<octopus-studio-write path="src/file.js" description="A test file">console.log('hello');`;
    const result = hasUnclosedOctopusStudioWrite(text);
    expect(result).toBe(true);
  });

  it("should return false when there are multiple closed octopus-studio-write tags", () => {
    const text = `<octopus-studio-write path="src/file1.js">code1</octopus-studio-write>
    Some text in between
    <octopus-studio-write path="src/file2.js">code2</octopus-studio-write>`;
    const result = hasUnclosedOctopusStudioWrite(text);
    expect(result).toBe(false);
  });

  it("should return true when the last octopus-studio-write tag is unclosed", () => {
    const text = `<octopus-studio-write path="src/file1.js">code1</octopus-studio-write>
    Some text in between
    <octopus-studio-write path="src/file2.js">code2`;
    const result = hasUnclosedOctopusStudioWrite(text);
    expect(result).toBe(true);
  });

  it("should return false when first tag is unclosed but last tag is closed", () => {
    const text = `<octopus-studio-write path="src/file1.js">code1
    Some text in between
    <octopus-studio-write path="src/file2.js">code2</octopus-studio-write>`;
    const result = hasUnclosedOctopusStudioWrite(text);
    expect(result).toBe(false);
  });

  it("should handle multiline content correctly", () => {
    const text = `<octopus-studio-write path="src/component.tsx" description="React component">
import React from 'react';

const Component = () => {
  return (
    <div>
      <h1>Hello World</h1>
    </div>
  );
};

export default Component;
</octopus-studio-write>`;
    const result = hasUnclosedOctopusStudioWrite(text);
    expect(result).toBe(false);
  });

  it("should handle multiline unclosed content correctly", () => {
    const text = `<octopus-studio-write path="src/component.tsx" description="React component">
import React from 'react';

const Component = () => {
  return (
    <div>
      <h1>Hello World</h1>
    </div>
  );
};

export default Component;`;
    const result = hasUnclosedOctopusStudioWrite(text);
    expect(result).toBe(true);
  });

  it("should handle complex attributes correctly", () => {
    const text = `<octopus-studio-write path="src/file.js" description="File with quotes and special chars" version="1.0" author="test">
const message = "Hello 'world'";
const regex = /<div[^>]*>/g;
</octopus-studio-write>`;
    const result = hasUnclosedOctopusStudioWrite(text);
    expect(result).toBe(false);
  });

  it("should handle text before and after octopus-studio-write tags", () => {
    const text = `Some text before the tag
<octopus-studio-write path="src/file.js">console.log('hello');</octopus-studio-write>
Some text after the tag`;
    const result = hasUnclosedOctopusStudioWrite(text);
    expect(result).toBe(false);
  });

  it("should handle unclosed tag with text after", () => {
    const text = `Some text before the tag
<octopus-studio-write path="src/file.js">console.log('hello');
Some text after the unclosed tag`;
    const result = hasUnclosedOctopusStudioWrite(text);
    expect(result).toBe(true);
  });

  it("should handle empty octopus-studio-write tags", () => {
    const text = `<octopus-studio-write path="src/file.js"></octopus-studio-write>`;
    const result = hasUnclosedOctopusStudioWrite(text);
    expect(result).toBe(false);
  });

  it("should handle unclosed empty octopus-studio-write tags", () => {
    const text = `<octopus-studio-write path="src/file.js">`;
    const result = hasUnclosedOctopusStudioWrite(text);
    expect(result).toBe(true);
  });

  it("should focus on the last opening tag when there are mixed states", () => {
    const text = `<octopus-studio-write path="src/file1.js">completed content</octopus-studio-write>
    <octopus-studio-write path="src/file2.js">unclosed content
    <octopus-studio-write path="src/file3.js">final content</octopus-studio-write>`;
    const result = hasUnclosedOctopusStudioWrite(text);
    expect(result).toBe(false);
  });

  it("should handle tags with special characters in attributes", () => {
    const text = `<octopus-studio-write path="src/file-name_with.special@chars.js" description="File with special chars in path">content</octopus-studio-write>`;
    const result = hasUnclosedOctopusStudioWrite(text);
    expect(result).toBe(false);
  });
});
