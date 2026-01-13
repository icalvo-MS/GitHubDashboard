import { githubClient } from "@/lib/github";

export class GitHubService {
    static async getUser(username: string) {
        const { data } = await githubClient.rest.users.getByUsername({
            username,
        });
        return data;
    }

    static async getCopilotUsage(org: string) {
        try {
            // GET /orgs/{org}/copilot/metrics
            const { data } = await githubClient.request('GET /orgs/{org}/copilot/metrics', {
                org: org,
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            });
            return data;
        } catch (error) {
            console.error("Error fetching Copilot metrics:", error);
            throw error;
        }
    }

    static async getCopilotSeats(org: string) {
        try {
            // GET /orgs/{org}/copilot/billing/seats
            const { data } = await githubClient.request('GET /orgs/{org}/copilot/billing/seats', {
                org: org,
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            });
            return data;
        } catch (error) {
            console.error("Error fetching Copilot seats:", error);
            return null;
        }
    }
    static async getOrgEvents(org: string) {
        try {
            const { data } = await githubClient.rest.activity.listPublicOrgEvents({
                org,
                per_page: 10,
            });
            return data;
        } catch (error) {
            console.error("Error fetching Org events:", error);
            return [];
        }
    }
}
