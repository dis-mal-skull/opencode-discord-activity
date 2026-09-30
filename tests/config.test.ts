import { describe, expect, test } from "bun:test"
import { installedOptions, removeFromConfigText, updateConfigText } from "../src/config"

const source = `{
  // Keep this comment
  "theme": "dark"
}
`

describe("OpenCode config", () => {
  test("adds the default plugin and preserves comments", () => {
    const output = updateConfigText(source)
    expect(output).toContain("Keep this comment")
    expect(output).toContain("opencode-discord-activity")
    expect(installedOptions(output)?.language).toBe("en")
  })

  test("is idempotent and supports custom options", () => {
    const once = updateConfigText(source, { language: "es", showFile: false })
    const twice = updateConfigText(once, { language: "es", showFile: false })
    expect(twice.match(/opencode-discord-activity/g)?.length).toBe(1)
    expect(installedOptions(twice)).toMatchObject({ language: "es", showFile: false })
  })

  test("removes the plugin", () => {
    const installed = updateConfigText(source, { clientId: "custom" })
    const output = removeFromConfigText(installed)
    expect(output).not.toContain("opencode-discord-activity")
    expect(installedOptions(output)).toBeNull()
  })
})
