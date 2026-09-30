export type Language = "en" | "es"

const languageByExtension: Record<string, string> = {
  ".c": "C",
  ".cpp": "C++",
  ".cs": "C#",
  ".css": "CSS",
  ".go": "Go",
  ".html": "HTML",
  ".java": "Java",
  ".js": "JavaScript",
  ".jsx": "React JSX",
  ".json": "JSON",
  ".md": "Markdown",
  ".php": "PHP",
  ".py": "Python",
  ".rs": "Rust",
  ".scss": "SCSS",
  ".sql": "SQL",
  ".ts": "TypeScript",
  ".tsx": "React TypeScript",
  ".vue": "Vue",
  ".yml": "YAML",
  ".yaml": "YAML",
}

const modelNames: Record<string, string> = {
  claude: "Claude",
  deepseek: "DeepSeek",
  gemini: "Gemini",
  gpt: "GPT",
  kimi: "Kimi",
  minimax: "MiniMax",
  nemotron: "Nemotron",
  qwen: "Qwen",
}

export type ActivityFormatOptions = {
  language?: Language
  showModel?: boolean
  showFile?: boolean
  showElapsedTime?: boolean
}

export type ActivityStateInput = ActivityFormatOptions & {
  projectName: string
  filePath?: string
  elapsed?: string
  busy: boolean
}

export function truncateDiscord(value: string, max = 128): string {
  return value.length <= max ? value : `${value.slice(0, max - 3)}...`
}

export function displayModel(modelID: string, providerID?: string): string {
  const raw = modelID.includes("/") ? modelID.split("/").at(-1)! : modelID
  const parts = raw.split(/[-_]/).filter(Boolean)
  const result = parts
    .map((part) => modelNames[part.toLowerCase()] ?? part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
  return result || providerID || "OpenCode"
}

export function languageForFile(filePath?: string): { name: string; extension: string } {
  if (!filePath) return { name: "File", extension: "" }
  const match = filePath.match(/(\.[^./\\]+)$/)
  const extension = match?.[1]?.toLowerCase() ?? ""
  return { name: languageByExtension[extension] ?? (extension ? extension.slice(1).toUpperCase() : "File"), extension }
}

export function formatDetails(modelID: string, providerID: string | undefined, options: ActivityFormatOptions = {}): string {
  const language = options.language ?? "en"
  if (options.showModel === false) return language === "es" ? "Programando con OpenCode" : "Coding with OpenCode"
  const model = displayModel(modelID, providerID)
  return truncateDiscord(language === "es" ? `Programando con ${model}` : `Coding with ${model}`)
}

export function formatState(input: ActivityStateInput): string {
  const language = input.language ?? "en"
  const showFile = input.showFile !== false
  const showElapsed = input.showElapsedTime !== false
  const idle = language === "es" ? "Esperando instrucciones" : "Waiting for instructions"

  if (!showFile || !input.filePath) {
    const status = input.busy ? (language === "es" ? "Trabajando" : "Working") : idle
    return truncateDiscord(`${input.projectName} • ${status}`)
  }

  const file = input.filePath
  const fileInfo = languageForFile(file)
  const elapsed = showElapsed && input.elapsed ? ` • ${input.elapsed}` : ""
  return truncateDiscord(`${input.projectName} • ${file} • ${fileInfo.name}${fileInfo.extension ? ` (${fileInfo.extension})` : ""}${elapsed}`)
}
