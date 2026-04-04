const auth = require("../lib/auth")

async function requireAuth(req, res, next) {
  const session = await auth.api.getSession({
    headers: req.headers,
  })

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  req.user = session.user
  next()
}

module.exports = requireAuth
