import express from 'express'
import session from 'express-session'
import dotenv from 'dotenv'
import flash from 'connect-flash'
import cookieParser from 'cookie-parser'
import expressLayouts from 'express-ejs-layouts'
import { scheduler } from './services/scheduler.js'

import router from './routers/index.js'
import initializeDB from './database/data.js'
import { isLoggedIn } from './middleware/auth.js'

dotenv.config()
const app = express()

// middlewares
app.use(expressLayouts)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(session({ 
    secret: process.env.SESSION_KEY,
    resave: false, 
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}))
app.use(flash())
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    next()
})
app.use(express.static('public'))
app.use(isLoggedIn)
app.use('/', router)

// settings
app.set('view engine', 'ejs')
app.set('views', './views')
app.set('layout', './layouts/main')

// database
initializeDB()

// job scheduler
scheduler()

// server
app.listen(process.env.DB_PORT, () => {
    console.log(`\n::: Server started at port number: ${process.env.DB_PORT} ::::\n`)
})