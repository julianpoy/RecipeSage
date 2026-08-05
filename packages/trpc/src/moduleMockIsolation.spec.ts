import { readdirSync, readFileSync } from "fs";
import { join, relative } from "path";
import { SPECS_REQUIRING_MODULE_MOCKS } from "../specsRequiringModuleMocks";

const packageRoot = join(__dirname, "..");
const MODULE_MOCK_CALLS = ["vi.mock(", "vi.hoisted(", "vi.doMock("];

const collectSpecFiles = () => {
  const entries = readdirSync(__dirname, {
    recursive: true,
    withFileTypes: true,
  });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".spec.ts"))
    .map((entry) => relative(packageRoot, join(entry.parentPath, entry.name)));
};

describe("module mock isolation", () => {
  test("every spec using module mocks is listed in SPECS_REQUIRING_MODULE_MOCKS", () => {
    const selfPath = relative(packageRoot, __filename);

    const offenders = collectSpecFiles()
      .filter((specPath) => specPath !== selfPath)
      .filter((specPath) => !SPECS_REQUIRING_MODULE_MOCKS.includes(specPath))
      .filter((specPath) => {
        const contents = readFileSync(join(packageRoot, specPath), "utf8");
        return MODULE_MOCK_CALLS.some((call) => contents.includes(call));
      });

    expect(offenders).toEqual([]);
  });

  test("every listed spec exists and actually uses module mocks", () => {
    const specFiles = collectSpecFiles();

    for (const specPath of SPECS_REQUIRING_MODULE_MOCKS) {
      expect(specFiles).toContain(specPath);

      const contents = readFileSync(join(packageRoot, specPath), "utf8");
      expect(MODULE_MOCK_CALLS.some((call) => contents.includes(call))).toBe(
        true,
      );
    }
  });
});
