import { Octokit } from "octokit";

// Secondary Octokit client that uses the Classic PAT.
// Classic tokens have manage_billing:copilot / read:org scopes needed for
// the enhanced billing platform endpoints.
export const githubClassicClient = new Octokit({
    auth: process.env.GITHUB_TOKEN_CLASSIC || process.env.GITHUB_TOKEN,
});
