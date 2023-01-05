# Modules

Overview over all modules and dependencies.

```mermaid
flowchart BT

AppModule --> BotModule
AppModule --> ActivityModule
AppModule --> CabinModule
AppModule --> DbModule
AppModule --> SubscriptionNotifierModule
ActivityModule --> ActivityDatabaseModule
ActivityModule --> DbModule
BotModule --> ActivityDatabaseModule
BotModule --> DiscordModule
BotModule --> CabinModule
BotModule --> EmbedModule
CabinModule --> CabinDatabaseModule
CabinModule --> VisbookModule
CabinDatabaseModule --> CabinUtModule
CabinDatabaseModule --> DbModule
CabinUtModule --> VisbookModule
DiscordModule --> SlashCommandModule
SubscriptionNotifierModule --> DiscordModule
SubscriptionNotifierModule --> SubscriptionModule
SubscriptionNotifierModule --> ActivityModule
SubscriptionNotifierModule --> CabinModule
SlashCommandModule --> CabinModule
SlashCommandModule --> ChatCommandModule
SlashCommandModule --> EmbedModule
SlashCommandModule --> SubscriptionModule
SubscriptionModule --> DbModule
```
