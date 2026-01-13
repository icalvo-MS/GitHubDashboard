This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

### GitHub OAuth Configuration

1. **`GITHUB_ID`** - Your GitHub OAuth App Client ID
   - Create a GitHub OAuth App at: https://github.com/settings/developers
   - Set Authorization callback URL to: `http://localhost:3000/api/auth/callback/github`

2. **`GITHUB_SECRET`** - Your GitHub OAuth App Client Secret
   - Generated when you create the OAuth App

### NextAuth Configuration

3. **`NEXTAUTH_URL`** - The base URL of your application
   - For local development: `http://localhost:3000`
   - For production: Your deployed URL

4. **`NEXTAUTH_SECRET`** - Secret key for encrypting tokens and sessions
   - Generate with: `openssl rand -base64 32`
   - Or use any secure random string

### Access Control

5. **`ALLOWED_USERS`** - Comma-separated list of GitHub usernames allowed to access the dashboard
   - Example: `icalvo-MS,jwaimann`
   - Only these users will be able to authenticate and view the dashboard

### GitHub API Access

6. **`GITHUB_TOKEN`** - GitHub Personal Access Token for fetching Copilot metrics
   - Create at: https://github.com/settings/tokens
   - Required scopes: `read:org`, `read:user`, `copilot`

### Example `.env.local`

```bash
GITHUB_ID=your_github_oauth_app_client_id
GITHUB_SECRET=your_github_oauth_app_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_generated_secret_here
ALLOWED_USERS=icalvo-MS,jwaimann
GITHUB_TOKEN=ghp_your_personal_access_token
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
