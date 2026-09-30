import { describe, expect, test } from "bun:test"
import { displayModel, formatDetails, formatState, languageForFile } from "../src/format"

describe("activity formatting", () => {
  test("formats model names", () => {
    expect(displayModel("deepseek-v4-flash", "deepseek")).toBe("DeepSeek V4 Flash")
    expect(displayModel("anthropic/claude-sonnet-4.6")).toBe("Claude Sonnet 4.6")
  })

  test("detects language and extension", () => {
    expect(languageForFile("src/App.tsx")).toEqual({ name: "React TypeScript", extension: ".tsx" })
  })

  test("formats English presence", () => {
    expect(formatDetails("deepseek-v4-flash", "deepseek")).toBe("Coding with DeepSeek V4 Flash")
    expect(formatState({ projectName: "demo", filePath: "src/App.tsx", busy: true, elapsed: "4m" })).toContain("React TypeScript (.tsx)")
  })

  test("formats Spanish presence and truncates long states", () => {
    const state = formatState({ projectName: "demo", filePath: "a/".repeat(100) + "main.ts", busy: true, language: "es" })
    expect(formatDetails("deepseek-v4-flash", undefined, { language: "es" })).toBe("Programando con DeepSeek V4 Flash")
    expect(state.length).toBeLessThanOrEqual(128)
  })
})
