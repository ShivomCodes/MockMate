const express = require("express")
const interviewRoutes = require("./interview")

const router = express.Router()

router.use(interviewRoutes)

module.exports = router
