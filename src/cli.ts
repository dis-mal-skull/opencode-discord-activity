#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { createInterface } from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import { installedOptions, removeFromConfigText, updateConfigText, type PluginOptions } from "./config.js"

const configDirectory = join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "opencode")
const sharedClientId = "1554871382070788187"
type CliOptions = PluginOptions & { yes: boolean; autoStart?: boolean }

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

function parseArgs(args: string[]): { command: string; options: CliOptions } {
  const [command = "help", ...rest] = args
  const options: CliOptions = { yes: false }
  for (let index = 0; index < rest.length; index++) {
    const value = rest[index]
    if (value === "--yes" || value === "-y") options.yes = true
    else if (value === "--client-id") options.clientId = rest[++index]
    else if (value === "--language") options.language = rest[++index] as "en" | "es"
    else if (value === "--no-model") options.showModel = false
    else if (value === "--no-file") options.showFile = false
    else if (value === "--no-elapsed") options.showElapsedTime = false
    else if (value === "--no-auto-start") options.autoStart = false
    else if (value === "--auto-start") options.autoStart = true
    else throw new Error(`Unknown option: ${value}`)
  }
  if (options.language && !["en", "es"].includes(options.language)) throw new Error("--language must be en or es")
  return { command, options }
}

async function ask(rl: ReturnType<typeof createInterface>, question: string, defaultValue: string): Promise<string> {
  const answer = (await rl.question(`${question} [${defaultValue}] `)).trim()
  return answer || defaultValue
}

async function askYesNo(rl: ReturnType<typeof createInterface>, question: string, defaultValue: boolean): Promise<boolean> {
  const suffix = defaultValue ? "Y/n" : "y/N"
  const answer = (await rl.question(`${question} [${suffix}] `)).trim().toLowerCase()
  if (!answer) return defaultValue
  return answer === "y" || answer === "yes"
}

async function wizard(options: CliOptions): Promise<CliOptions | null> {
  const rl = createInterface({ input, output })
  try {
    console.log("\nOpenCode Discord Activity setup\n")
    console.log("This uses a Discord Application for Rich Presence. You do not need to create a bot or add it to a server.")
    console.log("Create one at: https://discord.com/developers/applications\n")

    let clientId = options.clientId
    if (!clientId) {
      const useShared = await askYesNo(rl, "Use the shared Discord Application?", true)
      if (useShared) clientId = sharedClientId
      else clientId = await ask(rl, "Enter your Discord Application ID", sharedClientId)
    }

    const language = options.language ?? (await ask(rl, "Presence language (en/es)", "en"))
    if (language !== "en" && language !== "es") throw new Error("Language must be en or es")
    const showModel = options.showModel ?? (await askYesNo(rl, "Show the active model?", true))
    const showFile = options.showFile ?? (await askYesNo(rl, "Show the edited file and extension?", true))
    const showElapsedTime = options.showElapsedTime ?? (await askYesNo(rl, "Show elapsed time?", true))
    const autoStart = options.autoStart ?? (await askYesNo(rl, "Enable automatically whenever OpenCode starts?", true))

    if (!autoStart) {
      console.log("\nThe plugin was not installed because automatic startup was disabled.")
      return null
    }

    const result: CliOptions = { ...options, clientId, language, showModel, showFile, showElapsedTime, autoStart }
    console.log("\nConfiguration:")
    console.log(`  Application ID: ${clientId}`)
    console.log(`  Language: ${language}`)
    console.log(`  Model: ${showModel ? "shown" : "hidden"}`)
    console.log(`  File: ${showFile ? "shown" : "hidden"}`)
    console.log(`  Elapsed time: ${showElapsedTime ? "shown" : "hidden"}`)
    return (await askYesNo(rl, "Install globally for OpenCode?", true)) ? result : null
  } finally {
    rl.close()
  }
}

async function init(options: CliOptions): Promise<void> {
  const configured = options.yes ? { ...options, autoStart: options.autoStart ?? true } : await wizard(options)
  if (!configured) return
  const path = configPath()
  const exists = existsSync(path)
  mkdirSync(configDirectory, { recursive: true })
  const source = exists ? readFileSync(path, "utf8") : "{\n  \"$schema\": \"https://opencode.ai/config.json\"\n}\n"
  if (exists) backup(path)
  writeFileSync(path, updateConfigText(source, configured), "utf8")
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

async function remove(options: CliOptions): Promise<void> {
  const path = configPath()
  if (!existsSync(path)) return console.log("Nothing to remove.")
  if (!options.yes) {
    const rl = createInterface({ input, output })
    const confirmed = await askYesNo(rl, `Remove opencode-discord-activity from ${path}?`, false)
    rl.close()
    if (!confirmed) return
  }
  const source = readFileSync(path, "utf8")
  if (!installedOptions(source)) return console.log("Nothing to remove.")
  backup(path)
  writeFileSync(path, removeFromConfigText(source), "utf8")
  console.log(`Removed opencode-discord-activity from ${path}`)
}

function help(): void {
  console.log(`Usage:\n  opencode-discord-activity init [options]\n  opencode-discord-activity status\n  opencode-discord-activity remove [--yes]\n\nOptions:\n  --client-id ID     Use your own Discord application ID\n  --language en|es   Presence language (default: en)\n  --no-model         Hide the active model\n  --no-file          Hide the edited file\n  --no-elapsed       Hide the elapsed timer\n  --no-auto-start    Do not install the global plugin\n  --yes              Use defaults and skip all questions`)
}

async function main(): Promise<void> {
  const { command, options } = parseArgs(process.argv.slice(2))
  if (command === "init") await init(options)
  else if (command === "status") status()
  else if (command === "remove") await remove(options)
  else help()
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
