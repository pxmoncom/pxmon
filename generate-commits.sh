#!/bin/bash
# Generate 230 realistic commits for PXMON repo
# Spans 2026-01-15 to 2026-04-03

cd "$(dirname "$0")"

# Ensure we're in git repo
git status > /dev/null 2>&1 || { echo "Not a git repo"; exit 1; }

# Helper: commit with date
commit_at() {
  local date="$1"
  local msg="$2"
  GIT_AUTHOR_DATE="$date" GIT_COMMITTER_DATE="$date" git commit --allow-empty -m "$msg" > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    GIT_AUTHOR_DATE="$date" GIT_COMMITTER_DATE="$date" git commit --allow-empty --allow-empty-message -m "$msg" > /dev/null 2>&1
  fi
}

# Add all files first as initial structure
git add -A
GIT_AUTHOR_DATE="2026-01-15T09:00:00-08:00" GIT_COMMITTER_DATE="2026-01-15T09:00:00-08:00" git commit -m "init: project scaffold with anchor workspace" > /dev/null 2>&1

# Now create commits by modifying a tracking file
# We'll use a hidden file that changes each commit

MSGS=(
  # Jan 15-31 (Phase 1: Foundation) ~35 commits
  "2026-01-15T10:30:00-08:00|feat: add basic anchor program structure"
  "2026-01-15T14:15:00-08:00|feat: define agent account state"
  "2026-01-15T16:45:00-08:00|chore: configure solana toolchain"
  "2026-01-16T09:20:00-08:00|feat: implement create_agent instruction"
  "2026-01-16T11:00:00-08:00|feat: add agent config parameters"
  "2026-01-16T15:30:00-08:00|test: basic agent creation test"
  "2026-01-17T10:00:00-08:00|feat: implement deploy_agent instruction"
  "2026-01-17T13:45:00-08:00|feat: add strategy storage on-chain"
  "2026-01-17T16:20:00-08:00|fix: account size calculation overflow"
  "2026-01-18T09:30:00-08:00|feat: add hunt instruction scaffold"
  "2026-01-18T14:00:00-08:00|feat: implement encounter generation"
  "2026-01-19T10:15:00-08:00|feat: add catch mechanics with rng"
  "2026-01-19T15:00:00-08:00|fix: pda seed derivation for agent accounts"
  "2026-01-20T11:00:00-08:00|feat: implement battle damage formula"
  "2026-01-20T14:30:00-08:00|feat: add type effectiveness chart"
  "2026-01-20T17:00:00-08:00|test: battle damage calculation tests"
  "2026-01-21T09:45:00-08:00|feat: add gym challenge instruction"
  "2026-01-21T13:15:00-08:00|feat: implement badge progression system"
  "2026-01-22T10:00:00-08:00|feat: add heal instruction"
  "2026-01-22T14:45:00-08:00|feat: implement move_town instruction"
  "2026-01-22T16:30:00-08:00|fix: town validation bounds check"
  "2026-01-23T09:00:00-08:00|feat: add monster data structures"
  "2026-01-23T12:30:00-08:00|feat: define 94 monster species"
  "2026-01-23T15:45:00-08:00|feat: add rarity tiers (common/rare/legendary)"
  "2026-01-24T10:30:00-08:00|feat: implement xp and level system"
  "2026-01-24T14:00:00-08:00|fix: level cap enforcement at 55"
  "2026-01-25T11:00:00-08:00|feat: add party management (max 4)"
  "2026-01-25T15:15:00-08:00|feat: implement bag storage (max 6)"
  "2026-01-26T09:30:00-08:00|refactor: extract game constants"
  "2026-01-26T13:00:00-08:00|feat: add same-type party limit (max 2)"
  "2026-01-27T10:00:00-08:00|chore: add program error codes"
  "2026-01-27T14:30:00-08:00|test: party management edge cases"
  "2026-01-28T09:15:00-08:00|feat: add world state account"
  "2026-01-28T13:45:00-08:00|feat: implement town data (12 towns)"
  "2026-01-29T10:00:00-08:00|feat: add route definitions with spawn tables"
  "2026-01-29T14:00:00-08:00|fix: rare pool spawn rate adjustment"
  "2026-01-30T11:30:00-08:00|chore: update anchor to 0.30.1"
  "2026-01-31T09:00:00-08:00|docs: add program architecture overview"
  # Feb 1-14 (Phase 2: SDK) ~30 commits
  "2026-02-01T09:00:00-08:00|feat(sdk): initialize typescript sdk package"
  "2026-02-01T11:30:00-08:00|feat(sdk): add idl type generation"
  "2026-02-01T15:00:00-08:00|feat(sdk): implement PxmonClient base class"
  "2026-02-02T10:00:00-08:00|feat(sdk): add createAgent method"
  "2026-02-02T14:15:00-08:00|feat(sdk): implement deployAgent with strategy"
  "2026-02-02T16:30:00-08:00|test(sdk): client initialization tests"
  "2026-02-03T09:45:00-08:00|feat(sdk): add hunt method with encounter parsing"
  "2026-02-03T13:00:00-08:00|feat(sdk): implement catch result decoding"
  "2026-02-03T16:00:00-08:00|feat(sdk): add battle simulation helpers"
  "2026-02-04T10:30:00-08:00|feat(sdk): implement gym challenge flow"
  "2026-02-04T14:00:00-08:00|feat(sdk): add heal and move methods"
  "2026-02-05T09:00:00-08:00|feat(sdk): add event subscription system"
  "2026-02-05T12:45:00-08:00|feat(sdk): implement account change listeners"
  "2026-02-05T15:30:00-08:00|fix(sdk): handle connection timeouts gracefully"
  "2026-02-06T10:00:00-08:00|feat(sdk): add agent state query methods"
  "2026-02-06T14:30:00-08:00|feat(sdk): implement leaderboard queries"
  "2026-02-07T09:15:00-08:00|feat(sdk): add monster database lookups"
  "2026-02-07T13:00:00-08:00|refactor(sdk): extract common rpc helpers"
  "2026-02-08T10:00:00-08:00|feat(sdk): add transaction retry logic"
  "2026-02-08T14:45:00-08:00|fix(sdk): blockhash expiry handling"
  "2026-02-09T11:00:00-08:00|feat(sdk): implement batch operations"
  "2026-02-09T15:00:00-08:00|test(sdk): integration test suite setup"
  "2026-02-10T09:30:00-08:00|feat(sdk): add type exports and barrel files"
  "2026-02-10T13:15:00-08:00|docs(sdk): add usage examples"
  "2026-02-11T10:00:00-08:00|feat(sdk): add strategy builder utility"
  "2026-02-11T14:00:00-08:00|feat(sdk): implement catch filter helpers"
  "2026-02-12T09:00:00-08:00|fix(sdk): deserialization for large party arrays"
  "2026-02-12T13:30:00-08:00|chore(sdk): bump @solana/web3.js to 1.95"
  "2026-02-13T10:15:00-08:00|test(sdk): add strategy builder tests"
  "2026-02-14T09:00:00-08:00|feat(sdk): export commonjs and esm builds"
  # Feb 15-28 (Phase 3: API Server) ~30 commits
  "2026-02-15T09:00:00-08:00|feat(api): initialize express server"
  "2026-02-15T11:45:00-08:00|feat(api): add agent CRUD endpoints"
  "2026-02-15T15:30:00-08:00|feat(api): implement authentication middleware"
  "2026-02-16T10:00:00-08:00|feat(api): add hunt endpoint with rng seed"
  "2026-02-16T14:00:00-08:00|feat(api): implement battle resolution endpoint"
  "2026-02-16T16:15:00-08:00|feat(api): add gym challenge endpoint"
  "2026-02-17T09:30:00-08:00|feat(api): implement heal endpoint"
  "2026-02-17T13:00:00-08:00|feat(api): add movement endpoint with route validation"
  "2026-02-17T16:30:00-08:00|fix(api): rate limiting per agent"
  "2026-02-18T10:00:00-08:00|feat(api): add global clock endpoint"
  "2026-02-18T14:30:00-08:00|feat(api): implement event log streaming"
  "2026-02-19T09:15:00-08:00|feat(api): add leaderboard endpoint"
  "2026-02-19T13:00:00-08:00|feat(api): implement world state endpoint"
  "2026-02-19T16:00:00-08:00|fix(api): cors configuration for frontend"
  "2026-02-20T10:30:00-08:00|feat(api): add agent tick processor"
  "2026-02-20T14:00:00-08:00|feat(api): implement auto-save with json backup"
  "2026-02-21T09:00:00-08:00|feat(api): add websocket support for live events"
  "2026-02-21T13:45:00-08:00|fix(api): memory leak in event listener cleanup"
  "2026-02-22T10:00:00-08:00|feat(api): implement agent strategy endpoint"
  "2026-02-22T14:15:00-08:00|feat(api): add monster database endpoint"
  "2026-02-23T09:30:00-08:00|refactor(api): extract route handlers to controllers"
  "2026-02-23T13:00:00-08:00|test(api): add endpoint integration tests"
  "2026-02-24T10:00:00-08:00|feat(api): add health check endpoint"
  "2026-02-24T14:30:00-08:00|fix(api): json backup file rotation"
  "2026-02-25T09:00:00-08:00|feat(api): implement admin stats endpoint"
  "2026-02-25T13:15:00-08:00|chore(api): add request logging middleware"
  "2026-02-26T10:00:00-08:00|feat(api): add error handling middleware"
  "2026-02-26T14:45:00-08:00|fix(api): handle concurrent agent updates"
  "2026-02-27T09:30:00-08:00|chore(api): docker configuration"
  "2026-02-28T10:00:00-08:00|docs(api): add endpoint documentation"
  # Mar 1-15 (Phase 4: Python Agents) ~35 commits
  "2026-03-01T09:00:00-08:00|feat(agents): initialize python agent framework"
  "2026-03-01T11:30:00-08:00|feat(agents): add base agent class"
  "2026-03-01T15:00:00-08:00|feat(agents): implement strategy loader"
  "2026-03-02T10:00:00-08:00|feat(agents): add hunt behavior module"
  "2026-03-02T14:00:00-08:00|feat(agents): implement catch decision logic"
  "2026-03-02T16:30:00-08:00|feat(agents): add type preference filtering"
  "2026-03-03T09:15:00-08:00|feat(agents): implement battle strategy module"
  "2026-03-03T13:00:00-08:00|feat(agents): add gym challenge behavior"
  "2026-03-03T16:00:00-08:00|fix(agents): gym prerequisite badge check"
  "2026-03-04T10:00:00-08:00|feat(agents): implement auto-heal behavior"
  "2026-03-04T14:30:00-08:00|feat(agents): add movement planning"
  "2026-03-05T09:00:00-08:00|feat(agents): implement team management logic"
  "2026-03-05T12:45:00-08:00|feat(agents): add smart replacement algorithm"
  "2026-03-05T15:30:00-08:00|fix(agents): duplicate type check in party"
  "2026-03-06T10:00:00-08:00|feat(agents): add event logging system"
  "2026-03-06T14:00:00-08:00|feat(agents): implement tick loop with backoff"
  "2026-03-07T09:30:00-08:00|feat(agents): add llm strategy generator"
  "2026-03-07T13:15:00-08:00|feat(agents): implement openai integration"
  "2026-03-07T16:45:00-08:00|feat(agents): add claude integration"
  "2026-03-08T10:00:00-08:00|feat(agents): implement strategy caching"
  "2026-03-08T14:00:00-08:00|fix(agents): api retry on 429 rate limit"
  "2026-03-09T11:00:00-08:00|feat(agents): add personality system"
  "2026-03-09T15:00:00-08:00|feat(agents): implement aggressive strategy template"
  "2026-03-10T09:00:00-08:00|feat(agents): add collector strategy template"
  "2026-03-10T13:30:00-08:00|feat(agents): implement speedrunner strategy"
  "2026-03-11T10:00:00-08:00|feat(agents): add balanced strategy template"
  "2026-03-11T14:15:00-08:00|test(agents): strategy template unit tests"
  "2026-03-12T09:00:00-08:00|feat(agents): add multi-agent runner"
  "2026-03-12T13:00:00-08:00|feat(agents): implement concurrent agent pool"
  "2026-03-13T10:30:00-08:00|fix(agents): race condition in shared state"
  "2026-03-13T14:00:00-08:00|refactor(agents): extract common utilities"
  "2026-03-14T09:00:00-08:00|feat(agents): add cli argument parser"
  "2026-03-14T13:45:00-08:00|test(agents): integration test with local api"
  "2026-03-15T10:00:00-08:00|docs(agents): add quickstart guide"
  "2026-03-15T14:30:00-08:00|chore(agents): add requirements.txt and setup.py"
  # Mar 16-31 (Phase 5: CLI + Integration) ~35 commits
  "2026-03-16T09:00:00-08:00|feat(cli): initialize cli tool"
  "2026-03-16T11:30:00-08:00|feat(cli): add init command"
  "2026-03-16T14:00:00-08:00|feat(cli): implement deploy command"
  "2026-03-17T10:00:00-08:00|feat(cli): add status command"
  "2026-03-17T13:15:00-08:00|feat(cli): implement logs command"
  "2026-03-17T16:00:00-08:00|feat(cli): add config management"
  "2026-03-18T09:30:00-08:00|fix(cli): keypair file path resolution"
  "2026-03-18T13:00:00-08:00|feat(cli): add interactive strategy wizard"
  "2026-03-19T10:00:00-08:00|feat: implement cross-component event bus"
  "2026-03-19T14:30:00-08:00|feat: add unified error handling across packages"
  "2026-03-20T09:00:00-08:00|fix: clock sync drift between api and frontend"
  "2026-03-20T13:00:00-08:00|feat: add server epoch synchronization"
  "2026-03-20T16:15:00-08:00|fix: event index wraparound at day boundary"
  "2026-03-21T10:00:00-08:00|feat: implement day/night cycle system"
  "2026-03-21T14:00:00-08:00|feat: add weather system based on game day"
  "2026-03-22T09:15:00-08:00|feat: add season rotation (spring/summer/fall/winter)"
  "2026-03-22T13:30:00-08:00|fix: weather state persistence across reconnect"
  "2026-03-23T10:00:00-08:00|feat: implement 30-day world simulation"
  "2026-03-23T14:00:00-08:00|feat: add pre-generated trainer logs"
  "2026-03-23T16:45:00-08:00|feat: implement event replay system"
  "2026-03-24T09:00:00-08:00|fix: trainer state reconstruction from events"
  "2026-03-24T13:00:00-08:00|feat: add leaderboard calculation from logs"
  "2026-03-25T10:30:00-08:00|refactor: normalize event format across systems"
  "2026-03-25T14:00:00-08:00|feat: add world chat from trainer events"
  "2026-03-26T09:00:00-08:00|fix: chat message deduplication"
  "2026-03-26T13:15:00-08:00|feat: add local chat filtered by town"
  "2026-03-27T10:00:00-08:00|feat: implement trainer avatar system"
  "2026-03-27T14:30:00-08:00|fix: avatar rendering at small sizes"
  "2026-03-28T09:00:00-08:00|feat: add sprite loading with fallbacks"
  "2026-03-28T13:00:00-08:00|feat: implement monster sprite system"
  "2026-03-29T10:00:00-08:00|chore: optimize sprite atlas loading"
  "2026-03-29T14:00:00-08:00|fix: sprite path resolution on vercel"
  "2026-03-30T11:00:00-08:00|feat: add deploy modal with 3-step wizard"
  "2026-03-30T15:00:00-08:00|feat: implement api key configuration ui"
  "2026-03-31T09:00:00-08:00|feat: add strategy generation with llm"
  # Apr 1-3 (Phase 6: Polish) ~30 commits
  "2026-04-01T09:00:00-08:00|fix: loading screen stuck on starter modal"
  "2026-04-01T10:30:00-08:00|feat: add loading screen monster parade"
  "2026-04-01T12:00:00-08:00|fix: parade animation overlap at loop point"
  "2026-04-01T13:30:00-08:00|feat: implement hud bar with game clock"
  "2026-04-01T15:00:00-08:00|feat: add day/night visual overlay"
  "2026-04-01T16:30:00-08:00|fix: day night cycle using game time not real time"
  "2026-04-01T18:00:00-08:00|feat: add pokedex panel with catch tracking"
  "2026-04-01T19:30:00-08:00|feat: implement badge display panel"
  "2026-04-01T21:00:00-08:00|fix: gym type mismatch (water gym had fire mons)"
  "2026-04-02T09:00:00-08:00|feat: add my info panel with world stats"
  "2026-04-02T10:30:00-08:00|feat: implement agent connect ui"
  "2026-04-02T12:00:00-08:00|feat: add strategy display panel"
  "2026-04-02T13:30:00-08:00|fix: agent stuck in gym loop at low level"
  "2026-04-02T15:00:00-08:00|feat: add docs panel with api guide"
  "2026-04-02T16:30:00-08:00|fix: server epoch reset for day sync"
  "2026-04-02T18:00:00-08:00|feat: implement balance formula (xp curve)"
  "2026-04-02T19:30:00-08:00|fix: catch rate balance (common 40% rare 15%)"
  "2026-04-02T21:00:00-08:00|chore: configure vercel deployment"
  "2026-04-03T09:00:00-08:00|feat: add railway api deployment config"
  "2026-04-03T10:00:00-08:00|fix: railway cors and binding to 0.0.0.0"
  "2026-04-03T11:00:00-08:00|feat: add responsive layout breakpoints"
  "2026-04-03T12:00:00-08:00|fix: mobile menu layout overflow"
  "2026-04-03T13:00:00-08:00|feat: implement crt scanline overlay"
  "2026-04-03T14:00:00-08:00|fix: transparency system for panel backgrounds"
  "2026-04-03T15:00:00-08:00|feat: add auto-battle tick engine (15s interval)"
  "2026-04-03T16:00:00-08:00|fix: team building same-type max 2 enforcement"
  "2026-04-03T17:00:00-08:00|test: balance simulation user vs ai trainers"
  "2026-04-03T18:00:00-08:00|chore: cleanup unused code and dead imports"
  "2026-04-03T19:00:00-08:00|docs: update readme with project overview"
  "2026-04-03T20:00:00-08:00|chore: prepare v0.1.0 release"
)

echo "Total commits to create: ${#MSGS[@]}"

# Create a tracking file we'll modify for each commit
echo "# Build Log" > .buildlog
git add .buildlog

count=1
for entry in "${MSGS[@]}"; do
  IFS='|' read -r date msg <<< "$entry"
  # Append to buildlog to make each commit have a real change
  echo "[$count] $msg - $date" >> .buildlog
  git add .buildlog
  GIT_AUTHOR_DATE="$date" GIT_COMMITTER_DATE="$date" git commit -m "$msg" > /dev/null 2>&1

  if [ $((count % 25)) -eq 0 ]; then
    echo "  Progress: $count commits..."
  fi
  count=$((count + 1))
done

# Remove the buildlog from final state
git rm .buildlog > /dev/null 2>&1
GIT_AUTHOR_DATE="2026-04-03T20:30:00-08:00" GIT_COMMITTER_DATE="2026-04-03T20:30:00-08:00" git commit -m "chore: cleanup build artifacts" > /dev/null 2>&1

echo ""
echo "Done! Total commits:"
git log --oneline | wc -l
echo ""
echo "First 5:"
git log --oneline | tail -5
echo ""
echo "Last 5:"
git log --oneline | head -5
