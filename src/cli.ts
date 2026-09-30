#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { installedOptions, removeFromConfigText, updateConfigText, type PluginOptions } from "./config.js"

const configDirectory = join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "opencode")

function configPath(): string {
  const jsonc = join(configDirectory, "opencode.jsonc")
  if (existsSync(jsonc)) return jsonc
  return join(configDirectory, "opencode.json")
}

function backup(path: string): void {
  if (!existsSync(path)) return
  const target = `${path}.bak`
  if (!existsSync(target)) {
    copyFileSync(path, target)
    return
  }
  copyFileSync(path, `${path}.${Date.now()}.bak`)
}

function parseArgs(args: string[]): { command: string; options: PluginOptions & { yes: boolean } } {
  const [command = "help", ...rest] = args
  const options: PluginOptions & { yes: boolean } = { yes: false }
  for (let index = 0; index < rest.length; index++) {
    const value = rest[index]
    if (value === "--yes" || value === "-y") options.yes = true
    else if (value === "--client-id") options.clientId = rest[++index]
    else if (value === "--language") options.language = rest[++index] as "en" | "es"
    else if (value === "--no-model") options.showModel = false
    else if (value === "--no-file") options.showFile = false
    else if (value === "--no-elapsed") options.showElapsedTime = false
    else throw new Error(`Unknown option: ${value}`)
  }
  if (options.language && !["en", "es"].includes(options.language)) throw new Error("--language must be en or es")
  return { command, options }
}

function confirm(message: string, yes: boolean): boolean {
  if (yes) return true
  process.stdout.write(`${message} [y/N] `)
  return readFileSync(0, "utf8").trim().toLowerCase() === "y"
}

function init(options: PluginOptions & { yes: boolean }): void {
  const path = configPath()
  const exists = existsSync(path)
  if (!confirm(`Update ${path}?`, options.yes)) return
  mkdirSync(configDirectory, { recursive: true })
  const source = exists ? readFileSync(path, "utf8") : "{\n  \"$schema\": \"https://opencode.ai/config.json\"\n}\n"
  if (exists) backup(path)
  writeFileSync(path, updateConfigText(source, options), "utf8")
  console.log(`Installed ${"opencode-discord-activity"} in ${path}`)
  console.log("Restart OpenCode for the plugin to load.")
}

function status(): void {
  const path = configPath()
  if (!existsSync(path)) return console.log("Not installed: OpenCode global config does not exist.")
  const options = installedOptions(readFileSync(path, "utf8"))
  if (!options) return console.log("Not installed in the global OpenCode config.")
  console.log(`Installed in ${path}`)
  console.log(JSON.stringify(options, null, 2))
}

function remove(options: PluginOptions & { yes: boolean }): void {
  const path = configPath()
  if (!existsSync(path)) return console.log("Nothing to remove.")
  if (!confirm(`Remove opencode-discord-activity from ${path}?`, options.yes)) return
  const source = readFileSync(path, "utf8")
  if (!installedOptions(source)) return console.log("Nothing to remove.")
  backup(path)
  writeFileSync(path, removeFromConfigText(source), "utf8")
  console.log(`Removed opencode-discord-activity from ${path}`)
}

function help(): void {
  console.log(`Usage:\n  opencode-discord-activity init [options]\n  opencode-discord-activity status\n  opencode-discord-activity remove [--yes]\n\nOptions:\n  --client-id ID     Use your own Discord application ID\n  --language en|es   Presence language (default: en)\n  --no-model         Hide the active model\n  --no-file          Hide the edited file\n  --no-elapsed       Hide the elapsed timer\n  --yes              Skip confirmation prompts`)
}

try {
  const { command, options } = parseArgs(process.argv.slice(2))
  if (command === "init") init(options)
  else if (command === "status") status()
  else if (command === "remove") remove(options)
  else help()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
