require('dotenv').config();
const express = require('express')
const cors = require('cors')
const getBranchName = require('./utils/get-branch-name')

const routes = require('./router')
const app = express();
const port = process.env.PORT || 3001

process.env.BRANCH = getBranchName()

app.use(cors())

// create a GET route
app.use(routes)

// This displays message that the server running and listening to specified port
app.listen(port, () => console.log(`Chirp-chirp! The server is now listening on port ${port}!`))
