# Development Server

Start or stop the backend API server for local development and testing.

## Usage

```
/dev-server [start|stop|status]
```

## Instructions

This skill manages the backend API server running on port 3080.

### Commands

**start** (default):
1. Check if the server is already running by calling `curl -s http://localhost:3080/` (returns `OK`)
2. If already running, inform the user and exit
3. If not running, start the server in the background:
   ```bash
   cd apps/backend && bun run dev
   ```
   Use `run_in_background: true` for the Bash tool
4. Wait for the server to be ready by polling the root endpoint (up to 10 seconds):
   ```bash
   for i in {1..10}; do curl -s http://localhost:3080/ && break || sleep 1; done
   ```
5. Confirm the server is running and ready

**stop**:
1. Find the server process: `lsof -ti:3080`
2. Kill the process if found: `kill $(lsof -ti:3080)`
3. Confirm the server has stopped

**status**:
1. Check if the server is running by calling `curl -s http://localhost:3080/`
2. Report the status to the user

## Example Output

```
Starting backend server...
Server started in background (task ID: abc123)
Waiting for server to be ready...
✓ Server is running at http://localhost:3080
```

## Notes

- The server runs on port 3080 by default (`SERVER_PORT` in `apps/backend/.env`)
- There is no `/health` route; `GET /` returns the string `OK`
- The server needs Postgres running (`docker compose up -d`) or it will fail on boot
- Logs are available in the background task output
