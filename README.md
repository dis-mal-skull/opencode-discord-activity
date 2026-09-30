# OpenCode Discord Activity

Discord Rich Presence for OpenCode. It shows the active model, project, edited file, language, extension, and elapsed time without sending source code anywhere.

## Quick Start

Prerequisites:

- Discord Desktop must be running.
- OpenCode must be installed.
- Node.js 20 or newer is required for the installer.

Clone the repository and build the installer:

```bash
git clone https://github.com/dis-mal-skull/opencode-discord-activity.git
cd opencode-discord-activity
npm install
npm run build
node dist/cli.js init
```

The setup wizard explains each step and asks for:

- Your Discord Application ID, with the shared application selected by default.
- Presence language.
- Whether to show the active model, edited file, and elapsed time.
- Whether to enable the plugin every time OpenCode starts, enabled by default.

This project uses a Discord **Application** for Rich Presence. You do not need to create a bot or add the application to a server. If you choose your own application, create it in the [Discord Developer Portal](https://discord.com/developers/applications) and copy its Application ID.

Restart OpenCode after the wizard finishes. The activity should appear on your Discord profile as:

```text
Coding with DeepSeek V4 Flash
discord-activity • src/index.ts • TypeScript (.ts)
```

For non-interactive setup, use flags:

```bash
node dist/cli.js init --client-id YOUR_APPLICATION_ID --language en --yes
```

Rich Presence assets are optional.

## Configuration

```bash
# Spanish presence
node dist/cli.js init --language es --yes

# Hide selected fields
node dist/cli.js init --no-model --no-elapsed --yes

# Inspect the current installation
node dist/cli.js status

# Remove the plugin
node dist/cli.js remove --yes
```

The CLI updates the global OpenCode config at `~/.config/opencode/opencode.json` or `opencode.jsonc`. Existing files are backed up before changes. Running `init` again is safe and does not duplicate the plugin.

## Manual Configuration

Add the package to the `plugin` array in the global OpenCode config:

```json
{
  "plugin": [
    [
      "opencode-discord-activity",
      {
        "clientId": "YOUR_APPLICATION_ID",
        "language": "en",
        "showModel": true,
        "showFile": true,
        "showElapsedTime": true
      }
    ]
  ]
}
```

Restart OpenCode after changing the configuration.

## Privacy

The plugin communicates with the local Discord Desktop client through Discord IPC. It does not send source code, file contents, prompts, or model responses to a remote service. Only names and metadata used by the Rich Presence are displayed locally in Discord.

The application ID is public. Never put a Discord client secret, bot token, or other credential in the config.

## Troubleshooting

If the activity does not appear:

1. Confirm Discord Desktop is open.
2. Restart OpenCode after running `init`.
3. Run `node dist/cli.js status` and verify the plugin is installed.
4. Check Discord privacy settings and allow activity status.
5. If you use a custom application, confirm its application ID and Rich Presence settings.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

## License

MIT
