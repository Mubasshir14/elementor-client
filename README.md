# Design-to-Elementor Frontend

This repository contains the Next.js frontend for the Design-to-Elementor platform.

## Overview

The frontend provides authenticated project creation and a modular, source-aware
intake workflow (`/projects/new`). Source-specific UI, hooks, services, types,
and tests are isolated under `features/`:

- **React / Next.js Project ZIP** (`features/react-nextjs/`) — drag-and-drop ZIP
  dropzone (up to 500 MiB, supporting direct and multipart uploads) with
  automatic React vs. Next.js detection and a static source analysis inspection
  view (router convention, routes, UI components, styles, and assets). Uploaded
  archives are inspected server-side without executing code.
- **Figma Design File** (`features/figma/`) — direct drag-and-drop uploader (up
  to 500 MiB) for a **native Figma `.fig` file** (File → Save local copy) or a
  Figma REST API file JSON export (`.json`). The file is uploaded and parsed
  locally with zero OAuth, account connection, file URL, or API token required.
- **Framer Project** (`features/framer/`) — published-site URL field analyzed
  server-side over HTTPS with SSRF protections.

The selected source type is a single authoritative state that drives the input
controls, upload/import flow, inspection summary, and subsequent conversion
reference. Switching sources clears incompatible input and validation.

The browser never performs conversion logic, code execution, or publish operations. Those responsibilities remain with the backend API.

## Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Feature-based modular architecture (`features/react-nextjs`, `features/figma`, `features/framer`, `features/conversions`, `features/artifacts`, `features/projects`)
- Centralized typed API client (`lib/api-client.ts`)
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
