import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [GitHub],
    callbacks: {
        async signIn({ profile }) {
            // If no allowlist is configured, block everyone for security (or allow dev? strict is better)
            if (!process.env.ALLOWED_USERS) {
                console.warn("ALLOWED_USERS environment variable is not set. Blocking sign-in attempt.");
                return false;
            }

            const allowedUsers = process.env.ALLOWED_USERS.split(',').map(u => u.trim().toLowerCase());
            const username = profile?.login ? String(profile.login).toLowerCase() : null;

            if (username && allowedUsers.includes(username)) {
                return true;
            }

            return false; // Return false to display a default error message
        },
        authorized: async ({ auth }) => {
            // Return true if the user is authenticated, false to redirect to login
            return !!auth
        },
    },
})
