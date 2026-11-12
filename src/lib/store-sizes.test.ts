import { describe, expect, it } from "vitest";
import { expandSizeSelections, LETTER_SIZES, NUMBER_SIZES } from "./store-sizes";

describe("store size selections", () => {
  it("supports multiple letter sizes with optional color", () => {
    expect(LETTER_SIZES).toEqual(expect.arrayContaining(["L", "XL"]));
    expect(expandSizeSelections([{ sizes: ["L", "XL"], color: "", price: "150", stock: "3" }]))
      .toEqual([{ size: "L", color: "", price: "150", stock: "3" }, { size: "XL", color: "", price: "150", stock: "3" }]);
  });
  it("supports numeric sizes 28, 32 and 36", () => {
    expect(NUMBER_SIZES).toEqual(expect.arrayContaining(["28", "32", "36"]));
    expect(expandSizeSelections([{ sizes: ["28", "32", "36"] }]).map((v) => v.size)).toEqual(["28", "32", "36"]);
  });
  it("expands select-all into a separate variant for every size", () => {
    expect(expandSizeSelections([{ sizes: LETTER_SIZES }]).map((v) => v.size)).toEqual(LETTER_SIZES);
    expect(expandSizeSelections([{ sizes: NUMBER_SIZES }]).map((v) => v.size)).toEqual(NUMBER_SIZES);
  });
  it("preserves existing identifiers only once and permits no size", () => {
    expect(expandSizeSelections([{ id: "existing", sizes: ["L", "XL", "XL"] }])).toEqual([{ id: "existing", size: "L" }, { size: "XL" }]);
    expect(expandSizeSelections([{ id: "legacy", sizes: [] }])).toEqual([{ id: "legacy", size: "" }]);
  });
});