const express = require('express')
const mongoose = require('mongoose')
require('dotenv').config()
const getRouter = require('./routes/get')
const getRouter2 = require('./routes/get2')
const postRouter = require('./routes/post')
const elimit = require('express-rate-limit')
const lauraSourceCodes = require('./bots/laura/bot')
const CharlloteSourceCodes = require('./bots/charlotte/bot')
const helenSourceCodes = require('./bots/helen/bot')
const zambiaBotsSourceCodes = require('./bots/zambias/bot')
const { UpdateFixuresFn, UpdateStandingFn } = require('./routes/fns/bongo-ligi')
const { UpdateOtherStandingFn, UpdateOtherFixuresFn, UpdateOtherTopScorerFn, UpdateOtherTopAssistFn } = require('./routes/fns/other-ligi')

const app = express()

// database connection
mongoose.connect(`mongodb://${process.env.USER}:${process.env.PASS}@nodetuts-shard-00-00.ngo9k.mongodb.net:27017,nodetuts-shard-00-01.ngo9k.mongodb.net:27017,nodetuts-shard-00-02.ngo9k.mongodb.net:27017/mkeka-wa-leo?authSource=admin&replicaSet=atlas-pyxyme-shard-0&w=majority&readPreference=primary&appname=MongoDB%20Compass&retryWrites=true&ssl=true`)
    .then(() => console.log('Connected to Mkeka Database'))
    .catch((err) => {
        console.log(err)
    })

const limiter = elimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // Limit each IP to 20 requests per `window` (here, per 1 minute)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: "To many request, please try again after 3 minutes"
})

// MIDDLEWARES
app.set('view engine', 'ejs')
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(__dirname + '/public'))
app.set('trust proxy', true) //our app is hosted on server using proxy to pass user request
//Attached webhook Bots Goes Here
if (process.env.local != 'true') {
    zambiaBotsSourceCodes.myBotsFn(app)
    helenSourceCodes.bot(app)
    CharlloteSourceCodes.bot(app)
    lauraSourceCodes.bot(app)
}


app.use(limiter)
app.use(postRouter)
app.use(getRouter)
app.use(getRouter2)

//Attached Bots Goes Here
if (process.env.local != 'true') {
    //
}

//updating ligis
setInterval(() => {
    let d = new Date().toLocaleTimeString('en-GB', { timeZone: 'Africa/Nairobi' })
    let [hh, mm, ss] = d.split(":")
    let time = `${hh}:${mm}`
    let hours = Number(hh)
    let mins = Number(mm)

    //update bongo at 18,19,21,23, and 04:01
    if (([18, 19, 21, 23, 4].includes(hours)) && mins == 1) {
        UpdateFixuresFn()
        setTimeout(() => {
            UpdateStandingFn()
        }, 5000)
    }

    //update europe leagues
    if ([18, 19, 20, 22, 23, 3].includes(hours)) {
        switch (mins) {
            case 2: //EPL on every 02 minute
                UpdateOtherStandingFn(39, 2024)
                setTimeout(() => {
                    UpdateOtherFixuresFn(39, 2024)
                }, 5000)
                break;

            case 5: //LaLiga on every 05 minute
                UpdateOtherStandingFn(140, 2024)
                setTimeout(() => {
                    UpdateOtherFixuresFn(140, 2024)
                }, 5000)
                break;
        }
    }

    //update assist and goals at 03:31 and at 10:31 
    if ([3, 10, 21].includes(hours)) {
        switch (mins) {
            case 31: //EPL top scorer on every 31
                UpdateOtherTopScorerFn(39, 2024)
                setTimeout(() => {
                    UpdateOtherTopAssistFn(39, 2024)
                }, 5000)
                break;

            case 33: //LaLiga top scorer on every 33
                UpdateOtherTopScorerFn(140, 2024)
                setTimeout(() => {
                    UpdateOtherTopAssistFn(140, 2024)
                }, 5000)
                break;
        }
    }
}, 1000 * 59)

app.listen(process.env.PORT || 3000, () => console.log('Running on port 3000'))

process.on('unhandledRejection', (reason, promise) => {
    console.log(reason)
    //on production here process will change from crash to start cools
})

//caught any exception
process.on('uncaughtException', (err) => {
    console.log(err)
})