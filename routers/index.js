import express from 'express'

import homeRoute from './home.routes.js'
import userRoutes from './users.routes.js'
import eventRoutes from './events.routes.js'
import contactUsRoutes from './contactUs.routes.js'
import bookingRoutes from './booking.routes.js'
import chatRoutes from './chat.routes.js'

import dashboardEventRoutes from './dashboard_events.routes.js'
import dashboardPostRoutes from './dashboard_posts.routes.js'
import dashboardRoutes from './dashboard.routes.js'
import { isAuthenticated, isAdmin, isUser } from '../middleware/auth.js'

const router = express.Router()

router.use('/users', userRoutes)
router.use('/events', eventRoutes)
router.use('/contactUs', contactUsRoutes)
router.use('/booking', isAuthenticated, isUser, bookingRoutes)

router.use('/dashboard', isAuthenticated, isAdmin, dashboardRoutes)
router.use('/dashboard/events', dashboardEventRoutes)
router.use('/dashboard/posts',dashboardPostRoutes )

router.use('/api', chatRoutes)

router.use('/', homeRoute) // index route

export default router