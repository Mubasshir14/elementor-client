# Frontend README

## 1. Project Overview

The frontend is the user interface for an AI-powered design-to-Elementor conversion platform.

Users can upload a React/Next.js codebase, provide screenshots, or submit a supported design source. They can configure the conversion, monitor progress, review diagnostics, and download the generated Elementor output.

The frontend must not perform the trusted conversion itself. All conversion, validation, file processing, and publishing operations must be handled by the backend.

## 2. Technology Stack

- Next.js with App Router
- React
- TypeScript
- Tailwind CSS
- A reusable and accessible UI component system
- Backend REST API
- Optional real-time progress updates, with polling as a fallback

Use the current stable versions that are compatible with the project and pin dependencies.

## 3. Main Features

1. **Authentication**
   - Sign in, register, and sign out.
   - Show pages and actions according to the user's permissions.

2. **Dashboard**
   - Show recent projects, conversion status, and available artifacts.
   - Provide clear loading, empty, and error states.

3. **Project Management**
   - Create, view, rename, and delete projects.
   - Display the input type and conversion history.

4. **Source Upload**
   - Accept supported ZIP archives, screenshots, and supported design-source inputs.
   - Display file names, sizes, upload progress, and validation errors.
   - Validate file type and size in the browser for usability; the backend must validate them again.

5. **Conversion Settings**
   - Select the source type.
   - Select Elementor Free or Pro as the intended target.
   - Select a target architecture only when supported by backend capability information.
   - Choose downloadable output or a connected WordPress destination, if available.

6. **Conversion Progress**
   - Show queued, running, waiting-for-approval, succeeded, failed, and canceled states.
   - Display the current processing stage and backend-provided diagnostics.
   - Allow retry or cancellation only when the backend confirms that the action is allowed.

7. **Review and Export**
   - Show validation results, warnings, unsupported features, and output details.
   - Allow authorized users to download generated artifacts.
   - Require confirmation before publishing to a connected WordPress site.

## 4. Suggested Pages

```text
/
├── /login
├── /register
├── /dashboard
├── /projects
├── /projects/new
├── /projects/[projectId]
├── /conversions/[conversionId]
├── /conversions/[conversionId]/review
├── /artifacts/[artifactId]
├── /sites
└── /settings
```

Adjust the routes to match the implemented application. Do not create placeholder pages that appear functional but have no working backend integration.

## 5. Frontend Structure

A suggested structure:

```text
apps/web/
├── app/
├── components/
│   ├── ui/
│   ├── layout/
│   └── shared/
├── features/
│   ├── auth/
│   ├── projects/
│   ├── uploads/
│   ├── conversions/
│   ├── artifacts/
│   └── wordpress-sites/
├── lib/
│   ├── api-client.ts
│   ├── schemas.ts
│   └── error-handling.ts
├── public/
└── README.md
```

Keep components reusable. Keep API communication in a shared client or feature-level API modules instead of duplicating request logic throughout the UI.

## 6. Backend Integration

The frontend communicates with the backend through documented, versioned API endpoints.

Expected operations include:

- Authentication and current-user information.
- Project creation and listing.
- Upload authorization and upload completion.
- Conversion creation and status retrieval.
- Conversion diagnostics and stage history.
- Artifact listing and download.
- Connected WordPress site management, when implemented.

Use the API's response as the source of truth for conversion status. Do not mark a conversion successful simply because an upload or HTTP request completed.

## 7. Security Requirements

- Never expose database credentials, AI API keys, storage secrets, or WordPress credentials in frontend code.
- Do not put secrets in `NEXT_PUBLIC_*` environment variables.
- Treat all IDs and data received from the browser as untrusted.
- Do not rely on frontend checks for authorization; the backend must enforce permissions.
- Do not execute uploaded source code in the browser.
- Do not render untrusted HTML directly.
- Do not expose stack traces, private storage keys, or internal server paths.
- Use secure session handling and CSRF protection where applicable.

## 8. Setup

From the repository root, install dependencies:

```bash
pnpm install
```

Create the frontend environment file, for example `apps/web/.env.local`:

```dotenv
NEXT_PUBLIC_APP_NAME="Design-to-Elementor"
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000/api/v1"
```

Only public configuration belongs in `NEXT_PUBLIC_*` variables. If the application uses a server-side proxy, keep internal API addresses private.

Start the frontend:

```bash
pnpm --filter web dev
```

The exact command depends on the package name defined in `apps/web/package.json`. Keep scripts documented and consistent with the actual configuration.

## 9. Quality Requirements

- Use TypeScript strict mode.
- Validate forms and show useful errors.
- Provide loading, empty, success, and failure states.
- Support responsive layouts and keyboard navigation.
- Use accessible labels and visible focus states.
- Test API errors, expired sessions, upload failures, and unauthorized resource access.
- Run linting, type checking, tests, and a production build before release.

## 10. Frontend Rule

The frontend is responsible for the user experience only. The backend is responsible for conversion rules, source analysis, AI orchestration, IR processing, Elementor compilation, security validation, and WordPress operations.
