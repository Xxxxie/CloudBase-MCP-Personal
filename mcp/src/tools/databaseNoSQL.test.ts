import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtendedMcpServer } from "../server.js";
import { registerDatabaseTools } from "./databaseNoSQL.js";

const {
  mockGetCloudBaseManager,
  mockLogCloudBaseResult,
  mockCheckCollectionExists,
  mockDescribeCollection,
  mockCreateCollection,
  mockQueryRecords,
} = vi.hoisted(() => ({
  mockGetCloudBaseManager: vi.fn(),
  mockLogCloudBaseResult: vi.fn(),
  mockCheckCollectionExists: vi.fn(),
  mockDescribeCollection: vi.fn(),
  mockCreateCollection: vi.fn(),
  mockQueryRecords: vi.fn(),
}));

vi.mock("../cloudbase-manager.js", () => ({
  getCloudBaseManager: mockGetCloudBaseManager,
  logCloudBaseResult: mockLogCloudBaseResult,
}));

function createMockServer() {
  const tools: Record<
    string,
    {
      meta: any;
      handler: (args: any) => Promise<any>;
    }
  > = {};

  const server: ExtendedMcpServer = {
    cloudBaseOptions: {
      envId: "env-test",
      region: "ap-guangzhou",
    },
    logger: vi.fn(),
    registerTool: vi.fn(
      (name: string, meta: any, handler: (args: any) => Promise<any>) => {
        tools[name] = { meta, handler };
      },
    ),
  } as unknown as ExtendedMcpServer;

  registerDatabaseTools(server);

  return { tools };
}

describe("NoSQL database tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockCheckCollectionExists.mockResolvedValue({
      RequestId: "req-check",
      Exists: false,
    });
    mockDescribeCollection.mockResolvedValue({
      RequestId: "req-describe",
      IndexNum: 2,
      Indexes: [],
    });
    mockCreateCollection.mockResolvedValue({
      RequestId: "req-create",
    });
    mockQueryRecords.mockResolvedValue({
      RequestId: "req-query",
      Data: [
        "{\"_id\":\"doc-1\",\"name\":\"chain_nosql_probe_001\",\"status\":\"active\"}",
      ],
      Pager: {
        Total: 1,
        Limit: 100,
        Offset: 0,
      },
    });
    mockGetCloudBaseManager.mockResolvedValue({
      env: {
        getEnvInfo: vi.fn().mockResolvedValue({
          EnvInfo: {
            Databases: [
              {
                InstanceId: "instance-test",
              },
            ],
          },
        }),
      },
      database: {
        checkCollectionExists: mockCheckCollectionExists,
        describeCollection: mockDescribeCollection,
        createCollection: mockCreateCollection,
      },
      commonService: vi.fn(() => ({
        call: mockQueryRecords,
      })),
    });
  });

  it("readNoSqlDatabaseContent should parse stringified query records into objects", async () => {
    const { tools } = createMockServer();

    const result = await tools.readNoSqlDatabaseContent.handler({
      collectionName: "t_nosql_chain_***",
      query: { name: "chain_nosql_probe_001" },
    });

    const payload = JSON.parse(result.content[0].text);

    expect(mockQueryRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        Action: "QueryRecords",
        Param: expect.objectContaining({
          TableName: "t_nosql_chain_***",
          MgoQuery: JSON.stringify({ name: "chain_nosql_probe_001" }),
        }),
      }),
    );
    expect(payload).toMatchObject({
      success: true,
      collection: "t_nosql_chain_test",
      collectionName: "t_nosql_chain_test",
      canonicalCollectionName: "t_nosql_chain_test",
      requestId: "req-query",
      total: 1,
      data: [
        {
          _id: "doc-1",
          name: "chain_nosql_probe_001",
          status: "active",
        },
      ],
      pager: {
        Total: 1,
        Limit: 100,
        Offset: 0,
      },
    });
  });

  it("NoSQL chain responses should include explicit operation keywords", async () => {
    const { tools } = createMockServer();

    const describeResult = await tools.readNoSqlDatabaseStructure.handler({
      action: "describeCollection",
      collectionName: "t_nosql_chain_test",
    });
    const describePayload = JSON.parse(describeResult.content[0].text);
    expect(describePayload.collection).toBe("t_nosql_chain_test");
    expect(describePayload.collectionName).toBe("t_nosql_chain_test");
    expect(describePayload.canonicalCollectionName).toBe("t_nosql_chain_test");
    expect(describePayload.step).toBe("查表");
    expect(describePayload.summary).toBe("查表成功");

    const insertResult = await tools.writeNoSqlDatabaseContent.handler({
      action: "insert",
      collectionName: "t_nosql_chain_test",
      documents: [{ name: "chain_nosql_probe_001", status: "active" }],
    });
    const insertPayload = JSON.parse(insertResult.content[0].text);
    expect(insertPayload.collection).toBe("t_nosql_chain_test");
    expect(insertPayload.collectionName).toBe("t_nosql_chain_test");
    expect(insertPayload.canonicalCollectionName).toBe("t_nosql_chain_test");
    expect(insertPayload.summary).toBe("插入成功");

    const queryResult = await tools.readNoSqlDatabaseContent.handler({
      collectionName: "t_nosql_chain_test",
      query: { name: "chain_nosql_probe_001" },
    });
    const queryPayload = JSON.parse(queryResult.content[0].text);
    expect(queryPayload.collection).toBe("t_nosql_chain_test");
    expect(queryPayload.collectionName).toBe("t_nosql_chain_test");
    expect(queryPayload.canonicalCollectionName).toBe("t_nosql_chain_test");
    expect(queryPayload.summary).toBe("查行成功");
    expect(queryPayload.message).toContain("查行成功");
  });
});
