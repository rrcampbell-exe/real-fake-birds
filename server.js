const express = require('express')
const cors = require('cors')

const routes = require('./src/server')
const path = require('path')
const app = express();
const port = process.env.PORT || 3001

app.use(cors())

// create a GET route
app.use(routes)

app.use(express.static(path.join(__dirname, 'build')));

app.get('/*', function (req, res) {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// This displays message that the server running and listening to specified port
app.listen(port, () => console.log(`Chirp-chirp! The server is now listening on port ${port}!`))