const express = require("express")
const cors = require("cors")
const { toNodeHandler } = require("better-auth/node")
require("dotenv").config()
const auth = require("./lib/auth")
const routes = require("./routes")

const app = express()
const PORT = process.env.PORT || 3000

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
)
app.use(express.json({ limit: "50mb" }))

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() })
})

app.all("/api/auth/*authPath", toNodeHandler(auth))
app.use(routes)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
