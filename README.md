# Leetcode Next.js

A LeetCode-style coding platform built with Next.js, Prisma, Clerk, and PostgreSQL. The app lets authenticated users solve problems in a browser-based editor, submit code against test cases, review submission history, manage playlists, and track progress from a personal profile dashboard.

## What It Does

- Browse coding problems with descriptions, examples, constraints, and difficulty labels.
- Write and run solutions in an in-browser editor.
- Submit solutions and review execution results and test-case output.
- View submission history, solved problems, and playlist activity on your profile.
- Create problems as an admin, with server-side validation against reference solutions before saving.
- Organize problems into personal playlists.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Prisma + PostgreSQL
- Clerk authentication
- Monaco Editor
- Tailwind CSS
- shadcn/ui-style component set
- Judge0-compatible code execution API

## Getting Started

### Prerequisites

- Node.js 18+ recommended
- A PostgreSQL database
- Clerk application keys

### Install

```bash
npm install
```

### Environment Variables

Create a local `.env` file and define the following values:

```env
DATABASE_URL=postgresql://user:password@host:5432/database

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

The codebase also integrates with a Judge0-compatible execution service for running solutions. If you rotate or externalize that integration, keep the README and runtime config in sync.

### Database

This repository includes a `docker-compose.yml` for local PostgreSQL:

```bash
docker compose up -d
```

The bundled compose file starts PostgreSQL on `localhost:5432` with database name `leetcode`, user `postgres`, and password `postgres123`.

After the database is available, run Prisma migrations:

```bash
npx prisma migrate dev
```

### Run Locally

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Scripts

- `npm run dev` - start the development server
- `npm run build` - build the app for production
- `npm run start` - start the production server
- `npm run lint` - run ESLint

## Project Structure

- `app/` - route handlers and pages
- `modules/` - domain logic and feature components
- `components/` - shared UI components
- `lib/` - database and integration helpers
- `prisma/` - schema and migration history
- `public/` - static assets

## Main Flows

- `/` - landing page and onboarding entry point
- `/problems` - problem list
- `/problem/[id]` - problem solving workspace
- `/profile` - user stats, solved problems, submissions, and playlists
- `/create-problem` - admin-only problem creation
- `/sign-in` and `/sign-up` - Clerk auth pages

## Notes

- The app uses Clerk to onboard users automatically when they land on the home page.
- Admin problem creation validates reference solutions against test cases before persisting a problem.
- Problem execution, submission history, and profile stats are all backed by Prisma models in `prisma/schema.prisma`.

