[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://github.com/codespaces/new?hide_repo_select=true&ref=main&repo=542440024)

# Music AI Discord Bot with Gemini

Names: Jack Jiang, Suna, Tyler, Michael W, Arshitha
# Sprint Release v2

## Overview
This release introduces AI integration and several music-related features to our Discord bot, enhancing user interaction, music discovery, and playback experiences.

## New Features

### 1. AI Integration (Google Gemini API)
- Integrated Google's Gemini API into the Discord bot.
- Enabled users to interact with AI directly through Discord.

### 2. Manage Favorite Songs
- Reply to one of the bot's song messages with `/saveFavorite` to save it.
- Repeated saves of the same song are rejected, even if capitalization or bot formatting differs.
- Use `/viewFavorites` to see your numbered list.
- Use `/removeFavorite <number>` to remove a song by its list number.
- Use `/clearFavorites` to clear your list.

### 3. Similar Song Recommendations (`/similar`)
- Recommends songs similar to a user-provided song.
- Helps users discover new music.

### 4. Song Preview Cards (`/song`)
- Displays song preview cards with album cover art.
- Provides song information in a visually appealing format.

### 5. Voice Channel Song Preview (`/play`)
- Added a new voice channel song preview feature.
- Allows users to listen to song previews directly in Discord voice channels.
- Enhances the interactive music experience.

### 6. Guess the Song (`/guess`)
- Choose a genre with buttons or `/guess <genre>`, then identify songs from audio clips.
- Earn more points for guessing with fewer hints; use `/leaderboard` to view top scores.

## Improvements
- Refactored `messageCreate.js` into a message router, separating command handling from the event entry point.
- Organized text commands into individual modules in `src/commands/`, with shared Gemini API logic in `src/services/gemini.js`.
- Kept feature-specific handlers such as favorites and the guessing game in separate files under `src/events/`; iTunes requests live alongside the commands and features that use them.
- This structure makes each feature easier to maintain, test, and extend without growing one large message handler.

## Documentation
- Updated README.md with new features and available commands.
- Updated the GitHub project description to reflect the latest functionality.

## Summary
This sprint expanded our Discord bot with AI-powered conversations, favorite song management, personalized music recommendations, visual song previews, voice channel playback, and a song-guessing game with a leaderboard. It also improved maintainability by separating message routing, commands, services, and feature handlers into focused modules.

--------------------------------------------------------------------------------------------------------


