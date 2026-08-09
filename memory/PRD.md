# Pro Ball Insights — PRD / Progress

## Product
Enterprise black & white NBA prediction app (React Native/Expo + FastAPI + MongoDB).
Tabs: Home, Predictions, Media, Chat, Profile.

## Data Sources
- balldontlie.io (NBA games + players) — FREE tier key (only `games` & `players`; `stats`/`season_averages`/`standings` return 401).
- The Odds API — real DraftKings/FanDuel/BetMGM odds.
- Emergent LLM (GPT-5.2) — AI consensus analysis articles.
- ESPN scoreboard — highlights.

## Prediction Model (stats-based, real)
- Team season stats are computed from REAL completed game results this season via the
  balldontlie `games` endpoint (avg points scored/allowed, win %, recent form over last 10).
  Cached 6h in `team_stats_cache`.
- Game score projection is deterministic:
  home = (home_off + away_def)/2 + 2.0 (HCA) + form adj; away = (away_off + home_def)/2 + form adj.
- Confidence from projected margin + win% gap + form gap + sample size (52–90%).
- NOTE: player-props still use heuristic/random stats because the balldontlie `/stats`
  endpoint requires a paid tier (401 on current key).

## Key Endpoints
- GET /api/games — games + stats-based predictions (public)
- GET /api/games/{id} — prediction detail
- GET /api/odds/all, /api/games/{id}/odds — real sportsbook odds
- GET /api/player-props — heuristic player props
- GET /api/highlights — ESPN highlights
- Auth: Emergent Google session (/api/auth/*), most routes public/guest.

## Status
- DONE: Replaced random game predictions with real stats-derived model. Verified vs live
  balldontlie data (e.g., Celtics 59-30, 114.2 PPG). Offseason (June 2026) => no scheduled
  games in the today window, so UI shows empty state until season games exist.

## Backlog / Future
- Player props on real data (needs balldontlie paid tier or alt source).
- Auto-polling for live scores.
- Refactor server.py (monolithic ~1200 lines) into routes/services.
