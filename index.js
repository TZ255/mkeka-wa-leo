const express = require('express')
const mongoose = require('mongoose')
const cachegoose = require('recachegoose');
require('dotenv').config()
const session = require('express-session');
const flash = require('connect-flash');
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
const { UpdateFixuresFn, UpdateStandingFn } = require('./routes/fns/bongo-ligi')
const { UpdateOtherStandingFn, UpdateOtherFixuresFn, UpdateOtherTopScorerFn, UpdateOtherTopAssistFn } = require('./routes/fns/other-ligi')
const { default: axios } = require('axios')
const { wafungajiBoraNBC, assistBoraNBC } = require('./routes/fns/ligikuucotz');
const checking3MkekaBetslip = require('./routes/fns/checking-betslip');

const app = express()

// database connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to Mkeka Database'))
    .catch((err) => {
        console.log(err)
    })

cachegoose(mongoose, {
    engine: 'memory'
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
app.use(getRouter3)

//Attached Bots Goes Here
if (process.env.local != 'true') {
    //
}


// ############### PROTECTED ###############
// ############### PROTECTED ###############
// ############### PROTECTED ###############

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
            ttl: 60 * 60 * 24 * 1,
            autoRemove: 'interval',
            autoRemoveInterval: 1 //remove expired every 1 minute
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 1, // 1 day (in miliseconds)
        },
        rolling: true //the session expiration will reset in every user interaction
    })
);

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect Flash
app.use(flash());

// Global variables for flash messages
app.use((req, res, next) => {
    // success messages
    res.locals.success_msg = req.flash('success_msg');
    // error messages
    res.locals.error_msg = req.flash('error_msg');
    // passport error messages
    res.locals.error = req.flash('error');
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

        //update betslip
        //angalia kila baada ya dakika 15
        if (mins % 15 === 0) {
            checking3MkekaBetslip(d_date)
        }

        //update bongo at 18,19,21,23, and 04:01
        if (([18, 19, 21, 23, 4].includes(hours)) && mins == 1) {
            UpdateFixuresFn()
            wafungajiBoraNBC() //scrape ligikuu.co.tz
            setTimeout(() => {
                UpdateStandingFn()
                assistBoraNBC() //scrape ligikuu.co.tz
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

        //update unimportant leagues
        if ([19, 22, 3].includes(hours)) {
            switch (mins) {
                case 6: //CAF on every 06 minute
                    UpdateOtherStandingFn(12, 2024)
                    setTimeout(() => {
                        UpdateOtherFixuresFn(12, 2024)
                    }, 5000)
                    break;

                case 7: //Confederation on every 07 minute
                    UpdateOtherStandingFn(20, 2024)
                    setTimeout(() => {
                        UpdateOtherFixuresFn(20, 2024)
                    }, 5000)
                    break;

                case 9: //caf wc qulifiers
                    UpdateOtherStandingFn(29, 2023)
                    setTimeout(() => {
                        UpdateOtherFixuresFn(29, 2023)
                    }, 5000);
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

                case 35: //CAF top scorer on every 35
                    UpdateOtherTopScorerFn(12, 2024)
                    setTimeout(() => {
                        UpdateOtherTopAssistFn(12, 2024)
                    }, 5000)
                    break;

                case 36: //CAF top scorer on every 36
                    UpdateOtherTopScorerFn(20, 2024)
                    setTimeout(() => {
                        UpdateOtherTopAssistFn(20, 2024)
                    }, 5000)
                    break;
            }
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