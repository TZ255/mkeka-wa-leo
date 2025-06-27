const express = require('express')
const mongoose = require('mongoose')
const cachegoose = require('recachegoose');
require('dotenv').config()
const session = require('express-session');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser')
const passport = require('passport');
const MongoStore = require('connect-mongo');
const requestIp = require('request-ip');

const getRouter = require('./routes/get')
const getRouter2 = require('./routes/get2-new')
const getBongoLigiRouter = require('./routes/get1-bongo-ligi')
const oldLeagueRedirects = require('./routes/old-ligi-redirects')
const getRouter3 = require('./routes/get3')
const routeAuth = require('./routes/get4-auth')
const resetAuth = require('./routes/fns/Auth/reset')
const postRouter = require('./routes/post')
const elimit = require('express-rate-limit')
const lauraSourceCodes = require('./bots/laura/bot')
const CharlloteSourceCodes = require('./bots/charlotte/bot')
const helenSourceCodes = require('./bots/helen/bot')
const zambiaBotsSourceCodes = require('./bots/zambias/bot')
const { UpdateBongoLeagueData } = require('./routes/fns/bongo-ligi')
const { UpdateOtherLeagueData, UpdateOtherLeagueMatchDay, UpdateMatchDayLeagueData } = require('./routes/fns/other-ligi')
const { default: axios } = require('axios')
const { wafungajiBoraNBC, assistBoraNBC } = require('./routes/fns/ligikuucotz');
const checking3MkekaBetslip = require('./routes/fns/checking-betslip');
const affAnalyticsModel = require('./model/affiliates-analytics');
const {sendNotification, sendLauraNotification} = require('./routes/fns/sendTgNotifications');
const mkekaUsersModel = require('./model/mkeka-users');
const BetslipModel = require('./model/betslip');
const { identity } = require('lodash');
const { getAllFixtures } = require('./routes/fns/fixtures');
const removeTrailingSlash = require('./routes/fns/removeTrailingSlash');

const app = express()

// database connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✔ Connected to Mkeka Database'))
    .catch((err) => {
        console.log(err)
    })

cachegoose(mongoose, {
    engine: 'memory'
})

// MIDDLEWARES
app.set('view engine', 'ejs')
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(__dirname + '/public'))
app.set('trust proxy', true) //our app is hosted on server using proxy to pass user request
app.use(requestIp.mw())

//Attached webhook Bots Goes Here
if (process.env.local != 'true') {
    zambiaBotsSourceCodes.myBotsFn(app)
    helenSourceCodes.bot(app)
    CharlloteSourceCodes.bot(app)
    lauraSourceCodes.bot(app)
}

//redirect old link setups -- note: above slash removal to avoid multiple redirects
app.use(oldLeagueRedirects)
// Apply the trailing slash removal middleware (only affects GET requests)
app.use(removeTrailingSlash())
app.use(postRouter)
app.use(getRouter)
app.use(getBongoLigiRouter)
app.use(getRouter2)
app.use(getRouter3)

//Attached Bots Goes Here
if (process.env.local != 'true') {
    //
}


// ############### PROTECTED ###############
// ############### PROTECTED ###############
// ############### PROTECTED ###############

//cookie parser for reading Cookies so that i can access req.cookies
app.use(cookieParser())

//Passport Config
require('./config/passport')(passport);

// session
app.use(
    session({
        secret: process.env.PASS,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URI,
            collectionName: 'mkeka-sessions',
            // ttl (time-to-live) in seconds: 7 days
            ttl: 60 * 60 * 24 * 7,
            autoRemove: 'native' //mongodb auto delete
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days (in miliseconds)
        },
        rolling: true //if set to TRUE the session expiration will reset in every user interaction
    })
);

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

//custom flash messages using cookie parser
app.use((req, res, next) => {
    // Check for success messages in the cookie then pass to res.locals
    if (req.cookies.success_msg) {
        res.locals.success_msg = req.cookies.success_msg;
        res.clearCookie('success_msg'); // Clear the cookie after it has been displayed
    }

    // Check for error messages in the cookie then pass to res.locals
    if (req.cookies.error_msg) {
        res.locals.error_msg = req.cookies.error_msg;
        res.clearCookie('error_msg'); // Clear the cookie after it has been displayed
    }

    // Check for passport error messages in the cookie
    if (req.cookies.error) {
        res.locals.error = req.cookies.error;
        res.clearCookie('error'); // Clear the cookie after it has been displayed
    }

    next();
});

app.use(routeAuth)
app.use(resetAuth)

//wrong url, redirect to home
app.get('*', (req, res) => {
    res.status(404).send('Page not found')
})

//updating ligis
setInterval(() => {
    if (process.env.local != 'true') {
        let d_date = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' })
        let d_time = new Date().toLocaleTimeString('en-GB', { timeZone: 'Africa/Nairobi' })
        let [hh, mm, ss] = d_time.split(":")
        let time = `${hh}:${mm}`
        let hours = Number(hh)
        let mins = Number(mm)

        //angalia betslip, getAllFixtures kila baada ya dakika 15
        if (mins % 15 === 0) {
            checking3MkekaBetslip(d_date)
        }

        //reset resend email count at 03:05 -- check matchdays
        if (hours === 3 && mins === 5) {
            affAnalyticsModel.findOneAndUpdate({ pid: 'shemdoe' }, { $set: { email_count: 0 } })
                .then(() => sendNotification(741815228, '✅ Email count set to 0'))
                .catch(e => sendNotification(741815228, e?.message))

            //check matchdays active true or false -- date format is YYYY-MM-DD
            UpdateOtherLeagueMatchDay(d_date.split('/').reverse().join('-'))
        }

        //update bongo Every 35 and 5 minutes
        if ((mins === 35 || mins == 5) && (hours >= 14 || hours < 5)) {
            wafungajiBoraNBC() //scrape ligikuu.co.tz
            setTimeout(() => {
                assistBoraNBC() //scrape ligikuu.co.tz
            }, 5000)
        }

        //update bongo league two times a day at 22:01 and 03:01
        if (mins === 1 && (hours === 22 || hours === 3)) {
            UpdateBongoLeagueData(567, 2024)
        }

        //update other leagues once a day at 01:10
        if (mins === 10 && (hours ===  1)) {
            UpdateMatchDayLeagueData();
        }

        //fixtures once a day at 00:01
        if (mins === 1 && (hours === 0)) {
            getAllFixtures()
        }

        //Build MikekayaUhakika every hour
        if (mins === 0) {
            axios.post(`https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/ae249406-125e-4e1a-a6fd-e58e7799db52`)
                .catch(e => console.log(e?.message))
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