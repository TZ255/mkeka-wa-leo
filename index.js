const express = require('express')
const mongoose = require('mongoose')
const cachegoose = require('recachegoose');
require('dotenv').config()
const session = require('express-session');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser')
const passport = require('passport');
const MongoStore = require('connect-mongo');
const getRouter = require('./routes/get')
const getRouter2 = require('./routes/get2')
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
const sendNotification = require('./routes/fns/sendTgNotifications');
const mkekaUsersModel = require('./model/mkeka-users');
const BetslipModel = require('./model/betslip');
const { identity } = require('lodash');

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
//Attached webhook Bots Goes Here
if (process.env.local != 'true') {
    zambiaBotsSourceCodes.myBotsFn(app)
    helenSourceCodes.bot(app)
    CharlloteSourceCodes.bot(app)
    lauraSourceCodes.bot(app)
}

app.use(postRouter)
app.use(getRouter)
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
            // ttl (time-to-live) in seconds: 1 day
            ttl: 60 * 60 * 24,
            autoRemove: 'native' //mongodb auto delete
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24, // 1 day (in miliseconds)
        },
        rolling: false //if TRUE the session expiration will reset in every user interaction
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
    res.redirect('/')
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

        //angalia betslip kila baada ya dakika 15
        if (mins % 15 === 0) {
            checking3MkekaBetslip(d_date)
        }

        //reset resend email count at 03:05 -- check matchdays
        if (hours === 3 && mins === 5) {
            affAnalyticsModel.findOneAndUpdate({ pid: 'shemdoe' }, { $set: { email_count: 0 } })
                .then(() => sendNotification(741815228, '✅ Email count set to 0'))
                .catch(e => sendNotification(741815228, e?.message))

            //check matchdays -- date format is YYYY-MM-DD
            UpdateOtherLeagueMatchDay(d_date.split('/').reverse().join('-'))
        }

        //update bongo Every 35 and 5 minutes
        if ((mins === 35 || mins == 5) && (hours >= 14 || hours < 5)) {
            UpdateBongoLeagueData(567, 2024)
            wafungajiBoraNBC() //scrape ligikuu.co.tz
            setTimeout(() => {
                assistBoraNBC() //scrape ligikuu.co.tz
            }, 5000)
        }

        //update other leagues every 30 minutes between 14:00 and 04:00
        if (mins % 30 === 0 && (hours >= 14 || hours < 5)) {
            UpdateMatchDayLeagueData();
        }

        //Build MikekayaUhakika
        if (hours % 2 === 0 && mins === 0) {
            axios.post(`https://api.netlify.com/build_hooks/6769da06b09a29e4ecf49b63`)
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