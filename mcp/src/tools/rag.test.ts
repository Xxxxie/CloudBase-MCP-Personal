import { describe, expect, it, vi } from "vitest";
import type { ExtendedMcpServer } from "../server.js";
import { registerRagTools } from "./rag.js";

function createMockServer() {
  const tools: Record<string, { meta: any; handler: (args: any) => Promise<any> }> = {};

  const server: ExtendedMcpServer = {
    registerTool: vi.fn(
      (name: string, meta: any, handler: (args: any) => Promise<any>) => {
        tools[name] = { meta, handler };
      },
    ),
  } as unknown as ExtendedMcpServer;

  return { server, tools };
}

describe("rag tools", () => {
  it("searchKnowledgeBase no longer requires id when mode=vector", async () => {
    const { server, tools } = createMockServer();

    await registerRagTools(server);

    await expect(
      tools.searchKnowledgeBase.handler({
        mode: "vector",
      }),
    ).rejects.toThrow("检索内容不能为空");
  });

  it("searchKnowledgeBase should expose skill mode and skillName", async () => {
    const { server, tools } = createMockServer();

    await registerRagTools(server);

    expect(tools.searchKnowledgeBase.meta.inputSchema.mode.options).toEqual(
      expect.arrayContaining(["vector", "skill", "openapi"]),
    );
    expect(tools.searchKnowledgeBase.meta.inputSchema.mode.options).not.toContain(
      "doc",
    );
    expect(tools.searchKnowledgeBase.meta.inputSchema.skillName).toBeDefined();
    expect(tools.searchKnowledgeBase.meta.inputSchema.docName).toBeUndefined();
  });
});
