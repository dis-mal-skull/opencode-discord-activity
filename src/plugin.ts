import { basename, extname, isAbsolute, relative, sep } from "node:path"
import { ActivityType, Client, PresenceBuilder } from "discord-rpc-new"
import type { Plugin } from "@opencode-ai/plugin"
import { displayModel, formatDetails, formatState, type Language } from "./format.js"

export type DiscordActivityOptions = {
  clientId?: string
  language?: Language
  showModel?: boolean
  showFile?: boolean
  showElapsedTime?: boolean
}

type EventInput = { event: { type: string; properties: any } }

const defaultClientId = "1554871382070788187"

function elapsedSince(startedAt: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export const DiscordActivity: Plugin = async ({ directory, client }, rawOptions = {}) => {
  const options = rawOptions as DiscordActivityOptions
  const language = options.language ?? "en"
  const rpc = new Client()
  const projectName = basename(directory) || directory
  let ready = false
  let busy = true
  let lastFile: string | undefined
  let currentModel = "OpenCode"
  let currentProvider: string | undefined
  let startedAt = Date.now()
  let pendingTimer: ReturnType<typeof setTimeout> | undefined

  const displayFile = (file: string) => {
    if (!isAbsolute(file)) return file
    const path = relative(directory, file)
    return path && !path.startsWith("..") && !path.includes(`:${sep}`) ? path : basename(file)
  }

  const update = () => {
    if (!ready) return
    const builder = new PresenceBuilder()
      .setType(ActivityType.Playing)
      .setDetails(formatDetails(currentModel, currentProvider, options))
      .setState(
        formatState({
          projectName,
          filePath: options.showFile === false || !lastFile ? undefined : displayFile(lastFile),
          busy,
          elapsed: elapsedSince(startedAt),
          ...options,
        }),
      )
    if (options.showElapsedTime !== false) builder.setStartTimestamp(startedAt)
    rpc.setActivity(builder.build())
  }

  const scheduleUpdate = () => {
    if (pendingTimer) clearTimeout(pendingTimer)
    pendingTimer = setTimeout(() => {
      pendingTimer = undefined
      update()
    }, 750)
  }

  rpc.on("disconnected", () => {
    ready = false
    void client.app.log({ body: { service: "discord-activity", level: "warn", message: "Discord disconnected" } }).catch(() => {})
  })

  rpc.login({ clientId: options.clientId ?? defaultClientId }).then(
    () => {
      ready = true
      update()
    },
    (error) => {
      void client.app.log({
        body: {
          service: "discord-activity",
          level: "warn",
          message: `Discord login failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      }).catch(() => {})
    },
  )

  return {
    event: async ({ event }: EventInput) => {
      if (event.type === "file.edited") {
        lastFile = event.properties.file
        busy = true
        scheduleUpdate()
      } else if (event.type === "session.idle") {
        busy = false
        scheduleUpdate()
      } else if (event.type === "session.status") {
        busy = event.properties.status?.type !== "idle"
        scheduleUpdate()
      } else if (event.type === "session.created") {
        startedAt = Date.now()
        lastFile = undefined
        busy = true
        scheduleUpdate()
      } else if (event.type === "message.updated") {
        const info = event.properties.info
        if (info?.modelID) currentModel = displayModel(info.modelID, info.providerID)
        if (info?.model?.modelID) {
          currentModel = displayModel(info.model.modelID, info.model.providerID)
          currentProvider = info.model.providerID
        }
        scheduleUpdate()
      }
    },
    "chat.message": async ({ model }: { model?: { providerID: string; modelID: string } }) => {
      if (!model?.modelID) return
      currentProvider = model.providerID
      currentModel = displayModel(model.modelID, model.providerID)
      scheduleUpdate()
    },
    dispose: async () => {
      if (pendingTimer) clearTimeout(pendingTimer)
      await rpc.destroy()
    },
  }
}

export default DiscordActivity
