import { describe, expect, it } from "vitest";
import {
  buildFunctionOperationErrorMessage,
  shouldInstallDependencyForFunction,
} from "./functions.js";

describe("functions tool helpers", () => {
  it("keeps HTTP functions from forcing dependency install when package.json is absent", () => {
    expect(shouldInstallDependencyForFunction("HTTP", false)).toBe(false);
    expect(shouldInstallDependencyForFunction("HTTP", true)).toBe(true);
  });

  it("returns a clearer HTTP path hint for undefined paths[0] failures", () => {
    const message = buildFunctionOperationErrorMessage(
      "createFunction",
      "httpDemo",
      "/tmp/project/cloudfunctions",
      new Error('[createFunction] The "paths[0]" argument must be of type string. Received undefined'),
    );

    expect(message).toContain("functionRootPath");
    expect(message).toContain("zipFile");
  });

  it("adds dependency-install guidance for HTTP function failures", () => {
    const message = buildFunctionOperationErrorMessage(
      "createFunction",
      "httpDemo",
      "/tmp/project/cloudfunctions",
      new Error("[httpDemo] 函数代码更新失败：云函数创建失败\n状态描述: 依赖安装失败"),
    );

    expect(message).toContain("原生 Node.js API");
    expect(message).toContain("package.json");
  });
});
