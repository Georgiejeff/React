# Higgsfield Animation Studio

A responsive React + Vite studio dashboard for organizing animation generation workflows. This work is being developed on the `feature/higgsfield-animation-studio` branch.

## Features in this branch
- Responsive studio dashboard with overview, create, render queue, media library, API settings, activity logs, and workspace settings.
- Interactive generation form with text-to-video, image-to-video, video-to-video, and text-to-image workflow selection.
- Local browser preview queue so the UI remains testable without backend credentials.
- Exportable render-job metadata.
- Server-side credential configuration guidance.

## Run the frontend locally
Requirements: Node.js 20+.
```bash
npm install
npm run dev
```
Open the local URL printed by Vite (usually `http://localhost:5173`).

## Production frontend build
```bash
npm run build
npm run preview
```

## Backend and real rendering
The frontend can call `POST /api/jobs` and `GET /api/health` when a backend is mounted behind the same origin. The included UI uses a local preview queue if no API is available. **A queued preview is not a real rendered video.**

To enable real rendering, configure an Express API, PostgreSQL, authentication, a persistent media bucket, and the provider's documented job-submission API. Keep provider keys in server-side environment variables only. Do not commit `.env` files or secrets.

## Environment variables
See `.env.example`. Provider submit endpoint and payload must match the current Comfy Cloud API/workflow configuration; the application must not assume a generic endpoint will work for every account.

## Deployment
The current branch is a development change only; it has not been deployed. A Render static site can build the frontend with `npm install && npm run build` and publish `dist`. For the full stack, deploy the API as a separate Render web service and connect a Render PostgreSQL database plus persistent object storage.
