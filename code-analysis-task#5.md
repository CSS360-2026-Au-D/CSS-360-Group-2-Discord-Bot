
## 1. Technical Debt and Code Smells (Suna Karaman)

### Introduction
In this part, I analyzed our Discord bot to identify code smells and technical debt that could affect its performance, and maintainability. My goal was to find weaknesses in our existing code, understand why they could become problems, and suggest possible improvements. I used ESLint and static analysis to examine the code.

### Method

I ran ESLint with our existing configuration. Then, I added rules to check function length (maximum 80 lines) and nesting depth (maximum 3).

After that, I manually reviewed the code using static analysis to find duplicated code, missing error handling, and unnecessary code. I also used `grep` to check whether certain parts of the code were being used.

I performed the analysis on my `task-5-code-analysis` branch without running or changing the bot.

### Findings

**1. `messageCreate.js` — Long Function and Duplicated Code**

ESLint found that the `execute()` function has 300 lines, which exceeds my selected limit of 80. This function handles many commands, including `hello`, `ping`, `/song`, `/play`, `/similar`, and `/ai`. Having too many responsibilities in one function makes the code harder to read and maintain.
I also noticed that `/song` and `/play` use similar code to make requests to the iTunes API. This is duplicated code because both commands repeat the same process instead of using a shared function.

**2. `favorite-song.js` — Temporary Storage and Missing Error Handling**

I was already aware that favorite songs are stored using `const favorites = new Map()`. This was a temporary solution when I developed the feature. Since the data is stored in memory, users lose their favorites when the bot restarts. I knew this was something we would need to improve later.

I also noticed that `message.channel.messages.fetch(replyId)` does not have a `try/catch` block. If the original message is deleted or unavailable, the bot may fail without giving the user a clear explanation.

**3. `loadEvents.js` — Unnecessary Code**

I found that `client.events` is created and updated, but it does not appear to be used elsewhere. I checked this using `grep`, which showed only three references across our source files.

Since the bot already uses `client.on()` to register event handlers, the collection appears to be unnecessary.

**4. Other Files — No ESLint Warnings**

I also analyzed `guildMemberAdd.js`, `ready.js`, and `loadFiles.js`. ESLint did not report any problems using my selected function-length and nesting-depth rules. However, this does not mean these files are completely free of code smells.

### Recommendations

Based on my findings, I think we should separate the commands in `messageCreate.js` into smaller functions to make the code easier to read, test, and maintain. We could also create one shared function for the iTunes API requests instead of repeating similar code in `/song` and `/play`.

For `favorite-song.js`, I recommend using a JSON file or database to store favorite songs so users do not lose them when the bot restarts. We should also add `try/catch` to handle errors when fetching messages and give users a clear response if something goes wrong.

Finally, I recommend removing the unused `client.events` collection in `loadEvents.js` if we confirm it is not needed anywhere else. This could help keep our code simpler and avoid unnecessary complexity.

## 2. Cyclomatic Complexity (Suna Karaman)

### Introduction

In this part, I measured the cyclomatic complexity of our Discord bot to understand how complex the functions are. My goal was to identify functions with too many decision paths, understand how this could affect testing and maintenance, and find possible ways to reduce unnecessary complexity.

### Method

I used ESLint to measure the cyclomatic complexity of each JavaScript file in our Discord bot. First, I set the threshold to 10 to identify functions with high complexity. Then, I changed it to 0 so ESLint would show the complexity of every function, including simple ones.

I analyzed each file separately using the following command and changing the file path:

```bash
npx eslint src/events/messageCreate.js --no-config-lookup --rule 'complexity: ["warn", 0]'
```
I used `--no-config-lookup` to ignore the project's existing ESLint configuration and apply the same rule to every file. I performed the analysis on my `task-5-code-analysis` branch without running or changing the bot.

### Findings

### 1. messageCreate.js — High Complexity

<img width="2233" height="492" alt="messageCreate" src="https://github.com/user-attachments/assets/f9843b57-8d2c-40c6-be85-a3d85c7a1257" />
ESLint reported that the execute() function has a cyclomatic complexity of 38, which is much higher than my selected threshold of 10. This is the most complex function in our bot. It handles several commands, including hello, ping, /song, /play, /similar, and /ai. Having multiple commands and conditions in one function increases the number of possible execution paths.

### 2. favorite-song.js — Moderate Complexity

<img width="2288" height="521" alt="favorite-song" src="https://github.com/user-attachments/assets/94a2b2cf-28d8-44cc-af0d-64390c26c1f5" />
The execute() function has a complexity of 12, which is slightly above my threshold of 10. This function handles both saving and viewing favorite songs. It also contains several conditions to check whether a song can be saved.

### 3. guildMemberAdd.js — Low Complexity

<img width="2221" height="492" alt="guildMemberAdd" src="https://github.com/user-attachments/assets/1d29d126-ff62-40b6-bd8b-e0e2d5136663" />
ESLint reported four functions with complexity scores of 2, 3, 1, and 1. All four functions are below the threshold of 10, which suggests that their control flow is relatively simple.

### 4. ready.js — Low Complexity

<img width="2274" height="492" alt="ready" src="https://github.com/user-attachments/assets/8d4e3203-e52a-450d-bb7b-845143bbe9d3" />
ESLint reported two functions, both with a complexity of 1. This is the lowest possible cyclomatic complexity, meaning these functions have no additional decision paths.

### 5. loadEvents.js — Low Complexity

<img width="2327" height="544" alt="loadEvents" src="https://github.com/user-attachments/assets/6a276741-92eb-47f7-b577-c6e0f2dfa11d" />
The loadEvents() function has a complexity of 5, while its arrow function has a complexity of 1. Both scores are below the threshold of 10, suggesting that these functions have relatively simple control flow.

### 6. loadFiles.js — Low Complexity

<img width="2231" height="463" alt="loadFiles" src="https://github.com/user-attachments/assets/4d4ec619-1f30-478a-88bf-de4915f2764d" />
ESLint reported two functions, both with a complexity of 1. This means their control flow is simple, with no additional decision paths.

### 7. app.js — No Functions Reported

ESLint did not report any complexity scores for app.js.

### 8. helpers/index.js — No Functions Reported

ESLint did not report any complexity scores for this file either

### Figure 1 - Below is a graph comparing the cyclomatic complexity of our bot's JavaScript files.

<img width="955" height="563" alt="Discord Bot — Cyclomatic Complexity by Source File" src="https://github.com/user-attachments/assets/e340297a-16ff-4931-bea6-3a6c24bcf097" />

### Recommendations

Based on my findings, I recommend separating the commands in `messageCreate.js` into smaller functions to reduce its cyclomatic complexity of 38. This could make the code easier to understand, test, and maintain.

For `favorite-song.js`, I recommend separating the saving and viewing features into different functions while keeping the necessary validation checks. This could help reduce its complexity of 12.

The other files have low complexity scores, so I don't think they need changes based on cyclomatic complexity alone.


















## 3. Cohesion and Coupling (Jack Jiang)

### Method

I read every file in `src/` on two branches: `main` and `feature/gemini-api`, which is the branch we run for demos. I used `npx madge --json src` to map which files import which, and I listed the outside packages and APIs each file depends on. Numbers below are from `feature/gemini-api` unless noted.

I rated each module with these definitions:

- **Cohesion** is how closely the code inside one module belongs together. *Functional* cohesion means the module does one job, which is best. *Logical* cohesion means unrelated jobs are grouped only because they look alike, which is weak.
- **Coupling** is how much one module depends on others. *Data* coupling means modules share only simple values, which is best. *Common* coupling means modules share global data, and *external* coupling means a module depends directly on outside systems. Both are weak.
- **Fan-in** is how many of our modules use a module. **Fan-out** is how many modules and outside packages it uses.

![madge dependency output](docs/images/madge-deps.png)

### Architecture overview

The bot has four layers. `app.js` creates the Discord client. `helpers/loadEvents.js` reads every file in `events/` and registers it. Each file in `events/` handles one Discord event. `services/gemini.js` talks to the Gemini API.

### Module ratings

| Module | Main job | Lines | Fan-in | Fan-out | Cohesion | Coupling |
| --- | --- | --- | --- | --- | --- | --- |
| app.js | Create client, start loader | 20 | 0 | 3 (discord.js, helpers, path) | Functional | Low |
| helpers/loadEvents.js | Register event files | 29 | 1 | 3 (loadFiles, ascii-table, path) | Functional | Low |
| helpers/loadFiles.js | List files in a folder | 7 | 1 | 1 (fs) | Functional | Low |
| services/gemini.js | Send a prompt to Gemini | 46 | 1 | 1 (Gemini API) | Functional | Low, data only |
| events/ready.js | Log when the bot is online | 15 | 0 | 0 | Functional | Low |
| events/guildMemberAdd.js | Welcome new members | 57 | 0 | 1 (discord.js) | Functional | Low |
| events/favorite-song.js | Save and list favorites | 60 | 0 | 0 | Functional | Low |
| events/messageCreate.js | Six text commands | 273 | 0 | 4 (gemini, axios, discord.js, iTunes API) | **Logical** | **High** |

Seven of eight modules are small and focused. Almost all of the weakness sits in one file.

### Findings

1. **Low cohesion in `messageCreate.js`.** One `execute` function handles hello, ping, help, `/song`, `/similar`, and `/ai`. These jobs share nothing except that they start from a chat message, which is logical cohesion. The function has 16 `if` checks, 4 `try` blocks, and about 19 calls to Discord. It is 273 lines on our branch and grows to 378 lines on `main` once `/play` is added. Every new command makes the function longer, and editing one command means scrolling through and risking all the others.
2. **High coupling to outside services.** `messageCreate.js` has the highest fan-out in the bot. It builds iTunes requests with axios, reads the raw iTunes response fields, writes the Gemini prompt, and formats Discord embeds, all in the same place. On `main` it also imports `@discordjs/voice`, ffmpeg, and `child_process`. If the iTunes response format changes, the command handler has to change too. This is external coupling.
3. **Good example: `services/gemini.js`.** It has functional cohesion and data coupling. It takes a string and returns a string, and it hides the URL, the API key, the timeout, and the response parsing. Both `/similar` and `/ai` reuse it, and the model could be changed in one place. This is the pattern the rest of the bot should follow.
4. **Good example: the event loader.** `loadEvents.js` registers any file placed in `events/`, so `app.js` does not need to know which events exist. Adding a new event file needs no change anywhere else. This keeps coupling between the startup code and the features low.

### Recommendation

Split `messageCreate.js` into one handler per command and keep `messageCreate.js` as a small router. Move the iTunes calls into an `itunesService.js`, following the same pattern as `gemini.js`. Move pure logic, such as building prompts and turning an iTunes result into an embed, into functions that take plain values. A possible structure:

```
src/
├── commands/        one file per command: song.js, similar.js, ai.js, help.js
├── services/        gemini.js, itunes.js
├── utils/           embeds.js, prompts.js
└── events/          messageCreate.js only routes to commands/
```

This would turn the one logical module into several functional modules, cut the fan-out of the router to one, and let each command be tested on its own.

## 4. Test Coverage (Jack Jiang)

### Method

I searched both branches for test files, test frameworks, and test scripts. Then I measured coverage across all source files with:

```
npx c8 --all --src src --include 'src/**' -r text node -e ""
```

The `--all` flag lists every source file, even files no test has touched. I also checked the GitHub Actions workflow for a test step.

### Result: 0% coverage on both branches

Neither branch has a `tests` folder or any test file. On our branch, `package.json` still has the template's `test` script, which runs mocha on `tests/*.spec.js`, and mocha and chai are installed. But `npm test` fails because there are no files to run. On `main`, there is no `test` script at all. The GitHub Actions workflow builds and pushes a Docker image but never runs tests.

![c8 coverage output](docs/images/c8-coverage.png)

### What this means

None of our features are checked automatically. If a change breaks a command, nobody finds out until a user tries it in Discord. The bot also depends on two outside APIs, Gemini and iTunes, and without tests we have no record of how it should behave when they are slow, return nothing, or return an error. Every one of those cases is a branch in the code, and 0% branch coverage means none of them have been checked.

### Testability by module

The cohesion and coupling results explain why coverage is hard to raise. Focused modules are easy to test, and the large mixed module is not.

| Module | How easy to test | Why |
| --- | --- | --- |
| helpers/loadFiles.js | Easy | Pure function, can use a temp folder |
| services/gemini.js | Easy | Takes a string, returns a string; mock `fetch` |
| events/ready.js | Easy | Pass a fake client and check the log |
| events/favorite-song.js | Medium | Needs a fake message, but logic is short |
| events/guildMemberAdd.js | Medium | Needs a fake member and channel; output is random |
| events/messageCreate.js | Hard | Six commands in one function; needs a fake message, fake axios, and fake Gemini for every test |

### Where to start

Tests should go first where a failure would hurt users most:

1. **`services/gemini.js`**: two commands depend on it. Test a normal reply, a missing API key, an error status, and an empty reply.
2. **`/song` in `messageCreate.js`**: it is the most complex command. Test an empty song name, no iTunes results, a missing preview, and a network error.
3. **`favorite-song.js`**: test saving, viewing an empty list, and viewing a full list.

A realistic first goal is 30% line coverage, focused on these three areas. After the refactor suggested above, each command could be tested on its own, and a goal of 70% would be reasonable.

### Recommendation

Use the existing mocha and chai setup, and add c8 to the `test` script so every run prints a coverage report. Mock `askGemini` and axios so tests never call real APIs. Then add `npm test` to the GitHub Actions workflow so every push is checked, and fail the build if coverage drops below the agreed goal.







## 5. Threat Model (Arshitha Bala Dhayanidhi)

### Introduction

In this part, I built a threat model of our Discord bot to find security and reliability risks. My goal was to find where untrusted data enters or leaves the bot, figure out what could go wrong at each of those points, and decide what we should do about each risk.

### Method

I followed the four threat-modeling questions: *What are we working on? What can go wrong? What are we going to do about it? Did we do a good enough job?*

To answer the first question, I used the Level 1 Data Flow Diagram and the Network Diagram from [ARCHITECTURE.md](ARCHITECTURE.md). The model covers all five features, plus how the bot is hosted and started:

| Feature | Command | External service |
| --- | --- | --- |
| AI Song Recommendation by mood | `/ai` | Google Gemini API |
| Similar Song Recommendation | `/similar` | Google Gemini API |
| Manage Favorites | `/saveFavorite`, `/viewFavorites` | Favorites storage |
| Song Preview Card | `/song` | iTunes API |
| Voice Channel Preview | `/play` | iTunes API, Discord voice channel |

Next, I marked every **trust boundary** in the diagram. A trust boundary is where data crosses between something our team controls (our bot code) and something we don't. Every arrow between our code and an outside entity crosses a boundary, in either direction.

| Data flow (from → to) | Data | Crosses a trust boundary? |
| --- | --- | --- |
| Discord User → all five features | commands and text typed by the user | Yes. Any user can type anything. |
| Bot → Discord User | replies, cards, AI answers | Yes. Anything we send is visible to everyone in the server. |
| iTunes API → `/song`, `/play` | track metadata, album art, preview URL | Yes. We don't control Apple's servers or their responses. |
| Gemini API → `/ai`, `/similar` | AI-generated text | Yes. We don't control what the AI writes back. |
| `/play` → Discord Voice Channel | audio stream | Yes. Everyone in the channel hears it. |
| Favorites → Favorites storage | saved songs | No. Favorites are kept in the bot's own memory. They would cross a boundary if we move them to an external database like D1. |

At each boundary, I used **STRIDE** to brainstorm threats. STRIDE is a checklist of six threat types:

| Letter | Threat type | Question |
| --- | --- | --- |
| S | Spoofing | Can someone pretend to be someone else? |
| T | Tampering | Can someone change data we rely on? |
| R | Repudiation | Can someone do something harmful without a trace? |
| I | Information disclosure | Can private info leak? |
| D | Denial of service | Can someone or something stop the bot from working? |
| E | Elevation of privilege | Can a user do something they shouldn't be allowed to? |

I checked each threat against the code on the `main` branch and rated it **High**, **Medium** or **Low** based on how likely it is and how much harm it would do. Our team runs a different branch, `feature/gemini-api`, for demos. That branch starts the bot differently, and I point out where this matters (T11).

### Findings

**Existing protections.** Some risks already handled by the bot:

- The bot token and API keys are meant to live in `.env`, which is listed in `.gitignore`.
- `/song` has a 10-second timeout on the iTunes request and a `catch` block that shows a friendly error without internal details.
- `/ai` and `/similar` split long replies into 1,900-character chunks to stay under Discord's 2,000-character limit.
- `askGemini` has a 30-second timeout and limits Gemini's answer to 400 output tokens.
- `/saveFavorite` only accepts replies to the bot's own messages, and users can only add to their own list.

**Threats found:** 

| # | Feature | Threat | STRIDE | Risk |
| --- | --- | --- | --- | --- |
| T1 | Song Preview Card | The user enters 2,000–4,000 characters for the song name (Nitro users can send up to 4,000). The "No results found" message doesn't come through, because Discord has a 2,000-character limit for bot messages and the message repeats the entered song name. | D | Medium |
| T2 | Song Preview Card | iTunes is down. | D | Low |
| T3 | Hosting | The bot runs only in a Codespace, so it goes offline when the Codespace stops. The deploy workflow triggers on a `release` branch that doesn't exist, so it never runs. | D | Medium |
| T4 | `/ai` and `/similar` | The user's text goes straight into Gemini's prompt. A user could type instructions ("ignore your rules and ...") to make the bot ignore its rules or post inappropriate content. | T | Medium |
| T5 | `/ai`, `/similar`, `/song` | The bot posts Gemini's reply and repeats user text without restricting mentions. If the bot has permission, a user could make it ping `@everyone` or `@here`, directly or by tricking Gemini into writing it. | E | Medium |
| T6 | Save favorites | Favorites are stored in a `new Map()` in memory (also noted in Section 1), which means the data will be lost if the bot restarts. The DFD shows a D1 database instead. | D | Medium |
| T7 | Save favorites | It checks if the message was sent by the bot, but not if the message was an error message or song details. Users can save error messages, or their own text through "No results found for ...", as favorites. Only their own list is affected. | T | Low |
| T8 | `/viewFavorites` | If the list is too long, it doesn't come through because of Discord's 2,000-character limit, and the user can never view their favorites again. | D | Low |
| T9 | `/play` | The iTunes request has no timeout, unlike `/song`'s, so the command can hang with no reply if iTunes is slow. | D | Low |
| T10 | `/play` | It doesn't check whether the user is in a voice channel and always joins one hardcoded channel. Anyone in any text channel can make the bot play audio there, and spamming `/play` starts a new audio player and ffmpeg process each time. | D | Medium |
| T11 | Startup on `main` | On `main`, `npm start` runs `src/events/index.js`, which calls `client.login("")` instead of reading the token from `.env`. To run `main`, a teammate has to paste the token into the code, where it can easily be committed. Anyone with the token fully controls the bot. (`feature/gemini-api` reads the token from `.env` correctly.) | I | High |

**Other gaps.** These aren't threats by themselves, but they came up while building the model:

1. **The diagram and the code disagree.** The DFD shows a D1 Favorites database, but the code uses an in-memory `Map` (T6).
2. **Setup docs are incomplete.** `.env-sample` doesn't list `GEMINI_API_KEY`, which `/ai` and `/similar` need.
3. **Leftover template code.** `build-and-deploy.yml` was copied from the class memebot template and never updated. It still tags the image `memebot:latest` and triggers on a branch that doesn't exist.

### Recommendations

Each threat is marked as **Fix** it where I proposed a fix, **Accept** it (with a reason), or **Already handled** (if the bot protects against it).

| # | Response | Details |
| --- | --- | --- |
| T1 | Fix | Use a generic error message like "No results found" or repeat only x characters of the user input |
| T2 | Already handled | The iTunes request has a 10-second timeout, and the `catch` block shows the user "Sorry, I couldn't reach the music service" while keeping error details in the console. |
| T3 | Accept | For this class, the bot only needs to be online during testing and demos. One teammate runs it at a time to avoid duplicate replies. Fix or remove the outdated deploy workflow. |
| T4 | Accept + partial fix | Prompt injection can't be fully prevented with current AI models. Limit input length, keep the 400-token output limit, and restrict mentions (T5). The bot can only post text, which limits the impact. |
| T5 | Fix | Add `allowedMentions: { parse: [] }` to bot replies, or set it once on the Discord client. |
| T6 | Fix | Connect favorites to the D1 database as the DFD shows, or update the DFD to match the code. |
| T7 | Fix | When `/song` finds a track, remember that message's ID with the track name and artist, and have `/saveFavorite` save that track info instead of the message text. |
| T8 | Fix | Split long `/viewFavorites` replies into 1,900-character chunks, the same way `/ai` does. |
| T9 | Fix | Add `timeout: 10000` to `/play`'s iTunes request, matching `/song`. |
| T10 | Fix | Join the user's own voice channel, refuse `/play` if they aren't in one, and ignore new `/play` commands while a song is playing. |
| T11 | Fix | Make `main` start the bot the same way as `feature/gemini-api`, reading the token from `.env`. Add `GEMINI_API_KEY` to `.env-sample`. If a token was ever committed, reset it in the Discord Developer Portal. |

I recommend fixing T11 first, since it puts the whole bot at risk. After that, T1, T5 and T10 should come next, because any user in the server could trigger them.

To check whether this model is good enough, I tested T1 with a fuzzer (see Section 6). The other threats are good candidates for the unit tests and smoke test that Section 4 recommends.


## 6. Fuzzer (Arshitha Bala Dhayanidhi)

### Introduction

In this part, I wrote a fuzzer to try to break our bot with random input. A fuzzer automatically generates hundreds of random inputs and checks that the bot follows certain rules for every one of them. My goal was to test the whole bot and to check whether the threats I found in my threat model (Section 5) actually happen.

### Method

I used [fast-check](https://wiki.communitydata.science/Fast-check), a property-based testing library for JavaScript. I installed it with `npm install --save-dev fast-check` and wrote the fuzzer in `src/fuzz/fuzz-bot.js`. It runs from the repo root with `node src/fuzz/fuzz-bot.js`

The fuzzer calls the real `execute()` functions in `messageCreate.js` and `favorite-song.js`. To run without a bot token or internet access, it replaces every outside service with a fake version:

| Service | Fake version |
| --- | --- |
| iTunes API (`/song`, `/play`) | Randomly returns either no results or a track with random details |
| Gemini API (`/ai`, `/similar`) | Returns random text up to 3,000 characters |
| Discord message | Records everything the bot sends and, like real Discord, rejects any message over 2,000 characters |
| Voice channel (`/play`) | Not available, so `/play` stops before playing audio |

For each test, fast-check builds a random message from one of our 9 commands (`/song`, `/play`, `/similar`, `/ai`, `/viewFavorites`, `/saveFavorite`, `hello`, `ping`, `help`) followed by random text. Half of the random texts are short (up to 100 characters), and half are long (1,990 to 4,000 characters), since Discord Nitro users can send up to 4,000 characters.

The fuzzer checks two rules for every message:

1. The bot never crashes.
2. The bot never tries to send a message longer than Discord's 2,000-character limit.

I ran 500 random messages per run on the `main` branch.

### Findings

<img width="1135" height="116" alt="Fuzzer output: FAIL on /song" src="https://github.com/user-attachments/assets/ff6da61d-6003-4d9d-bb74-6b2e7f32caa8" />

**1. `/song` breaks with long song names.** The fuzzer failed after 25 tests. fast-check shrank the failing input to `/song` followed by a 1,990-character song name. When iTunes finds no results, the bot replies `No results found for "<song name>".`, which repeats the whole song name. With a long name, this reply goes over 2,000 characters, Discord rejects it, and the `catch` block shows the user the wrong error: "Sorry, I couldn't reach the music service." This confirms threat **T1** from Section 5. The reply adds 24 characters around the song name, so any song name longer than 1,976 characters triggers the bug.

**2. The other commands passed.** When I ran the fuzzer again without `/song`, all 500 random messages passed.


<img width="1340" height="67" alt="Fuzzer output: PASS without including /song" src="https://github.com/user-attachments/assets/8aa01801-80f9-4866-9167-d3d4a42e816a" />


`/ai` and `/similar` handled long Gemini replies because they already split replies into 1,900-character chunks. `/play`, `/viewFavorites`, `/saveFavorite`, `hello`, `ping`, and `help` did not crash or send oversized messages.

**3. What the fuzzer could not test.** Some threats from Section 5 need more than random text to trigger:

- **T8** (long `/viewFavorites` list) needs many saved songs first, but each fuzz test starts with an empty list.
- **T9** and **T10** (`/play` timeout and voice channel checks) need a real voice channel and a slow iTunes response.
- **T4** and **T5** (prompt injection and `@everyone` pings) depend on what the real Gemini model writes, which a fake can't reproduce.

### Recommendations

I recommend fixing T1 by rejecting song names longer than 200 characters right after the empty-name check in `/song`, as proposed in Section 5. After the fix, the fuzzer should pass, and we can keep it as a regression test to make sure the bug doesn't come back.

I also recommend extending the fuzzer to cover the threats it could not reach. For example, it could save many favorites before calling `/viewFavorites` (T8), or simulate a slow iTunes response for `/play` (T9). Finally, adding the fuzzer to `npm test` would let it run automatically along with the unit tests that Section 4 recommends.
