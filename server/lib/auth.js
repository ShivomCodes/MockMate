const { betterAuth } = require("better-auth")
const { prismaAdapter } = require("better-auth/adapters/prisma")
const prisma = require("./prisma")

const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  trustedOrigins: [process.env.CLIENT_URL],
  secret: process.env.BETTER_AUTH_SECRET,
})

module.exports = auth
