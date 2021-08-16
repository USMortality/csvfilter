const express = require('express')
var os = require('os')
const request = require('request')
const path = require('path')
const url = require("url");
const app = express()
const port = process.env.PORT || 3000
const fs = require('fs');
const readline = require('readline');

function download(url, path) {
    return new Promise((resolve, reject) => {
        request.head(url, (err, res, body) => {
            request(url)
                .pipe(fs.createWriteStream(path))
                .on('close', () => {
                    console.log("downloaded")
                    resolve()
                })
        })
    })
}

function makeCsv(data) {
    let result = ""
    for (row of data) result += row + os.EOL
    return result
}

app.use('/', express.static(path.join(__dirname, 'public')))

app.get('/data.csv', async (req, res) => {
    console.log(`Downloading ${req.query.url}`)

    var parsed = url.parse(req.query.url);
    let filename = path.join('download', path.basename(parsed.pathname))

    let isCached = false
    if (fs.existsSync(filename)) {
        let stats = fs.statSync(filename)
        isCached = stats.mtime.getTime() > (new Date()).getTime() - 10 * 60 * 1000 // 10 Minutes cache
    }
    if (!isCached) {
        console.log('Downloading...')
        await download(req.query.url, filename)
    }

    let countries = req.query.countries.split(',')

    let filtered_data = await processLineByLine(filename, countries);
    console.log(filtered_data)
    res.header('Content-Type', 'text/csv')
    res.send(makeCsv(filtered_data))
})

async function processLineByLine(file, countries) {
    const fileStream = fs.createReadStream(file);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let filtered_data = [], first_line = true
    for await (const line of rl) {
        if (first_line) {
            first_line = false
            filtered_data.push(line)
        } else {
            countries.forEach(country => {
                if (line.startsWith(country)) {
                    filtered_data.push(line)
                }
            });
        }
    }
    return filtered_data
}

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})
