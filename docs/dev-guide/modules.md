# Modules

Overview over all modules and dependencies.

```mermaid
flowchart BT

ActivityModule --> ActivityDatabaseModule
BotModule --> ActivityDatabaseModule
BotModule --> DiscordModule
BotModule --> CabinModule
BotModule --> EmbedModule
CabinModule --> CabinDatabaseModule
CabinModule --> VisbookModule
CabinDatabaseModule --> CabinUtModule
CabinUtModule --> VisbookModule
DiscordModule --> CabinUtModule
DiscordModule --> SlashCommandModule
EmbedModule
SlashCommandModule --> CabinModule
SlashCommandModule --> DiscordModule
SlashCommandModule --> EmbedModule
```