
const { describe, it, expect } = require("@jest/globals");

describe("Health Check", () => {
    it("chạy được Jest", () => {
        expect(1 + 1).toBe(2);
    });
});
