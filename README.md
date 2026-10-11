# Design-to-Elementor Frontend

This repository contains the Next.js frontend for the Design-to-Elementor platform.

## Overview

The frontend provides authenticated project creation and a source-aware intake
page (`/projects/new`). Users pick one of three source cards, each with its own
input controls and real backend integration:

- **React / Next.js Project ZIP** — drag-and-drop ZIP dropzone with automatic
  framework detection. The archive is validated server-side; code is never
  executed in the browser.
- **Figma Design File** — a direct drag-and-drop uploader for a Figma REST API
  file JSON export. The file is uploaded and parsed locally; no Figma account,
  OAuth connection, file URL, or API token is required. Native .fig files are
  rejected with a clear message and export instructions.
- **Framer Project** — a published-site URL field analyzed server-side over
  HTTPS with SSRF protections. Labeled as published-site analysis, not native
  Framer recovery.

The selected source type is a single authoritative state that drives the input
controls, upload/import flow, and subsequent conversion reference. Switching
sources clears incompatible input and validation. Elementor conversion is shown
as unavailable until the approved DIR and Elementor compiler are available; the
capabilities endpoint is the source of truth.

The browser never performs conversion logic, code execution, or publish operations. Those responsibilities remain with the backend API.

## Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Centralized typed API client
- Accessible and responsive UI components

## Setup

```bash
pnpm install
cp .env.local.example .env.local
pnpm dev
```

Environment variables:

```env
NEXT_PUBLIC_APP_NAME="Design-to-Elementor"
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000/api/v1"
```

## Available routes

- `/`
- `/login`
- `/register`
- `/dashboard`
- `/projects`
- `/projects/new`
- `/projects/[projectId]`
- `/conversions/[conversionId]`
- `/conversions/[conversionId]/review`
- `/artifacts/[artifactId]`
- `/sites`
- `/settings`

## Quality gates

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## Security note

The frontend never stores or exposes secrets, database credentials, API keys, or WordPress credentials in public environment variables. All authorization and conversion trust decisions must be enforced by the backend.
