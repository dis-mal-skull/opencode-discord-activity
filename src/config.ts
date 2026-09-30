import { applyEdits, modify, parse } from "jsonc-parser"

export const PACKAGE_NAME = "opencode-discord-activity"

export type PluginOptions = {
  clientId?: string
  language?: "en" | "es"
  showModel?: boolean
  showFile?: boolean
  showElapsedTime?: boolean
}

export type InstallOptions = Required<PluginOptions>

function isPluginEntry(entry: unknown): boolean {
  return entry === PACKAGE_NAME || (Array.isArray(entry) && entry[0] === PACKAGE_NAME)
}

export function normalizeOptions(options: Partial<PluginOptions> = {}): InstallOptions {
  return {
    clientId: options.clientId ?? "1554871382070788187",
    language: options.language ?? "en",
    showModel: options.showModel ?? true,
    showFile: options.showFile ?? true,
    showElapsedTime: options.showElapsedTime ?? true,
  }
}

export function pluginEntry(options: Partial<PluginOptions> = {}): string | [string, InstallOptions] {
  const normalized = normalizeOptions(options)
  const defaults = normalizeOptions()
  if (JSON.stringify(normalized) === JSON.stringify(defaults)) return PACKAGE_NAME
  return [PACKAGE_NAME, normalized]
}

export function updateConfigText(text: string, options: Partial<PluginOptions> = {}): string {
  const config = parse(text) as Record<string, unknown>
  if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("OpenCode config must contain a JSON object")
  const plugins = Array.isArray(config.plugin) ? config.plugin.filter((entry) => !isPluginEntry(entry)) : []
  plugins.push(pluginEntry(options))
  const edits = modify(text, ["plugin"], plugins, { formattingOptions: { insertSpaces: true, tabSize: 2 } })
  return applyEdits(text, edits)
}

export function removeFromConfigText(text: string): string {
  const config = parse(text) as Record<string, unknown>
  if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("OpenCode config must contain a JSON object")
  const plugins = Array.isArray(config.plugin) ? config.plugin.filter((entry) => !isPluginEntry(entry)) : []
  const edits = modify(text, ["plugin"], plugins, { formattingOptions: { insertSpaces: true, tabSize: 2 } })
  return applyEdits(text, edits)
}

export function installedOptions(text: string): InstallOptions | null {
  const config = parse(text) as Record<string, unknown>
  const entry = Array.isArray(config?.plugin) ? config.plugin.find(isPluginEntry) : undefined
  if (typeof entry === "string") return normalizeOptions()
  if (Array.isArray(entry) && entry[1] && typeof entry[1] === "object") return normalizeOptions(entry[1] as PluginOptions)
  return null
}
