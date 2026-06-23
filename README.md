# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## AI Chat Server

This repo now includes a separate FastAPI service in `ai-server/` that:

- reads restaurant reviews from `backend/data/app.sqlite3`
- retrieves the most relevant reviews for each chat request
- sends that retrieved context to the OpenAI Chat Completions API

### Environment

Create local environment files from the committed examples:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Then replace the placeholder values in the two local `.env` files. Never commit real API keys.

- `OPENAI_API_KEY`: required for the AI server
- `OPENAI_MODEL`: optional model name, defaults to `gpt-4o-mini`
- `FOODAI_SQLITE_PATH`: optional override for the SQLite file
- `VITE_KAKAO_API_KEY`: Kakao Maps JavaScript key
- `VITE_AI_API_BASE_URL`: frontend URL for the AI server, defaults to `http://localhost:8000`

### Run

1. Start the Node backend:

   `cd backend && npm run start`

2. Start the AI server:

   `cd ai-server && pip install -r requirements.txt && uvicorn main:app --reload --port 8000`

3. Start the frontend:

   `cd frontend && npm run dev`

## One-command startup

From the repo root, run:

`powershell -ExecutionPolicy Bypass -File .\start-all.ps1`

This starts the Node backend, the FastAPI AI server, and the Vite frontend, then prints the service URLs.

The frontend launcher now uses Vite preview after a fresh build, which avoids the blank-page issue from the dev optimizer path.
