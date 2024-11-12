const express = require('express')
var os = require('os')
const request = require('request')
const path = require('path')
const url = require('url')
const app = express()
const port = process.env.PORT || 5000
const fs = require('fs')
const readline = require('readline')
const crypto = require('crypto')

function download(url, path) {
  return new Promise((resolve, reject) => {
    request.head(url, (err, res, body) => {
      if (err) {
        console.log(err)
        reject()
      }
      request(url)
        .pipe(fs.createWriteStream(path))
        .on('close', () => {
          console.log('downloaded')
          resolve()
        })
    })
  })
}

function makeCsv(data) {
  let result = ''
  for (row of data) result += row + os.EOL
  return result
}

async function handleRequest(req, res) {
  console.log(`Processing ${req.query.url}`)
  let hash = crypto.createHash('md5').update(req.query.url).digest('hex')
  let filename = path.join('download', `${hash}.csv`)
  console.log(filename)
  let isCached = false
  if (fs.existsSync(filename)) {
    let stats = fs.statSync(filename)
    isCached = stats.mtime.getTime() > new Date().getTime() - 10 * 60 * 1000 // 10 Minutes cache
  }
  if (!isCached) {
    console.log('Downloading...')
    await download(req.query.url, filename)
  }

  let filter
  if (req.query.filter) filter = req.query.filter
  else if (req.query.countries) filter = req.query.countries
  else {
    res.statusMessage = 'Must include filter parameter.'
    res.status(400).end()
  }

  let filtered_data = await processLineByLine(filename, filter.split(','))
  res.header('Content-Type', 'text/csv')
  res.send(makeCsv(filtered_data))
}

async function processLineByLine(file, filter) {
  const fileStream = fs.createReadStream(file)

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  let filtered_data = [],
    first_line = true
  for await (const line of rl) {
    if (first_line) {
      first_line = false
      filtered_data.push(line)
    } else {
      filter.forEach((country) => {
        if (line.includes(country)) {
          filtered_data.push(line)
        }
      })
    }
  }
  return filtered_data
}

app.use('/', express.static(path.join(__dirname, 'public')))
app.use(express.text())
app.get('/data.csv', handleRequest)
app.get('/data.tsv', handleRequest)

let errors = []
app.get('/error.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(errors, null, 2))
})

const n = 10000
app.post('/error', (req, res) => {
  if (
    !req ||
    !req.body ||
    !JSON.stringify(req.body).includes(process.env.JS_ID)
  ) {
    res.end()
    return
  }
  errors.unshift(req.body)
  if (errors.length > n) errors = errors.slice(0, n)
  res.end()
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
