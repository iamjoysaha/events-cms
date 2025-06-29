import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
import express from 'express'
import bcrypt from 'bcrypt'

import { createActivity, createUser, deleteBookingsByUser, deleteUserById, getActiveUsers, getActivities, getAllPosts, getAllUpcomingPosts, getCategories, getCategoryById, getEventById, getEventsByOrganizingCommitteeId, getOnlyUsers, getOrganizingCommitteeById, getPostsByEventId, getTotalViews, getUserById, getUsersByRoleId, updateUserById } from '../controller/index.js'
import { getStatus } from '../services/status.js'
import { sendMailToRegisteredUser } from '../services/mail.js'

dotenv.config()
const router = express.Router()

// dashboard home page
router.get('/', async (req, res) => {
    const token = req.cookies?.token
    const decoded = jwt.verify(token, process.env.MY_SECRET_KEY)

    const pageNo = parseInt(req.query.pageNo) || 1
    const pageSize = 20

    const { users } = await getActiveUsers(decoded._id)
    const { user } = await getUserById(decoded._id)
    const { events = [] } = await getEventsByOrganizingCommitteeId(user.organizing_committee_id) || {}
    const { posts = [] } = await getAllPosts()
    const upcomingEvents = posts.filter(post => getStatus(post.date, post.time) === 'upcoming')

    const { activities = [],  totalRecords } = await getActivities(pageNo, pageSize)
    const totalPages = Math.ceil(totalRecords / pageSize)

    const { totalViews } = await getTotalViews()
    const allAdmins = await getUsersByRoleId(1)
    
    res.render('pages/dashboard/home', { 
        layout:'layouts/dashboardLayout',  
        admin: user,
        totalAdminCount: allAdmins.users.length,
        activities,
        totalViews,
        activeUsers: users,
        events,
        upcomingEvents,
        query: req.query,
        totalPages,
        pageNo,
    })
})

// dashboard users page
router.get('/users', async (req, res) => {
    const message = req.flash('message')[0]
    const selectedStatus = req.query.status || ''
    const pageNo = parseInt(req.query.pageNo) || 1
    const pageSize = 10

    const token = req.cookies?.token
    const decoded = jwt.verify(token, process.env.MY_SECRET_KEY)
    let { users, totalRecords } = await getOnlyUsers(decoded._id, pageNo, pageSize)
    const totalPages = Math.ceil(totalRecords / pageSize)

    const { user } = await getUserById(decoded._id)
    const { name } = await getOrganizingCommitteeById(user.organizing_committee_id)

    // Filter users by status
    if (selectedStatus === 'active') {
        users = users.filter(user => user.status === 1)
    } 
    else if (selectedStatus === 'inactive') {
        users = users.filter(user => user.status === 0)
    }

    res.render('pages/dashboard/users', { 
        layout:'layouts/dashboardLayout',  
        admin: user,
        onlyUsers: users,
        organizingCommittee: name,
        selectedStatus,
        notify: message? message : null,
        query: req.query,
        totalPages,
        pageNo,
    })
})

// dashboard create new user
router.post('/user/create', async (req, res) => {
    const sessionUser = req.user
    const { first_name, last_name, email, username, password, organizing_committee_id, role_id } = req.body

    if (!first_name || !last_name || !email || !username || !password) {
        req.flash('message', 'Please fill all required fields!')
        return res.redirect('/dashboard/users')
    }

    const { message } = await createUser({ first_name, last_name, email, password, username, status: 1, is_owner: true, organizing_committee_id, role_id })
    await createActivity({ actions: `Created user: ${first_name} ${last_name} (${email})`, user_id: sessionUser._id })

    req.flash('message', message)
    res.redirect(`/dashboard/users`)
})


// dashboard delete user
router.post('/delete/user/:id', async (req, res) => {
    const token = req.cookies?.token
    const decoded = jwt.verify(token, process.env.MY_SECRET_KEY)

    const id = req.params.id
    const { user } = await getUserById(id)
    await deleteBookingsByUser(user.id)

    const { message } = await deleteUserById(user.id)
    await createActivity({ actions: `Deleted user: ${user.first_name} ${user.last_name} (${user.email})`, user_id: decoded._id })


    req.flash('message', message)
    return res.redirect('/dashboard/users')
})

// dashboard settings page
router.get('/settings', async (req, res) => {
    const message = req.flash('message')[0]

    const token = req.cookies?.token
    const decoded = jwt.verify(token, process.env.MY_SECRET_KEY)
    const { user } = await getUserById(decoded._id)

    res.render('pages/dashboard/settings', {
        layout:'layouts/dashboardLayout',
        admin: user,
        notify: message? message : null
    })
})

// update profile credentials
router.post('/settings/update/profile', async (req, res) => {
    const token = req.cookies?.token
    const decoded = jwt.verify(token, process.env.MY_SECRET_KEY)

    const {first_name, last_name, username, email } = req.body
    const { user } = await getUserById(decoded._id)
    const { message } = await updateUserById(user.id, {
        first_name,
        last_name,
        username, 
        email,
    })

    await createActivity({ actions: `Updated profile info: ${first_name} ${last_name} (${email})`, user_id: decoded._id })

    req.flash('message', message)
    return res.redirect('/dashboard/settings')
})

// update profile password
router.post('/settings/update/password', async (req, res) => {
    const token = req.cookies?.token
    const decoded = jwt.verify(token, process.env.MY_SECRET_KEY)

    const { currentPassword, newPassword, confirmPassword } = req.body
    const { user } = await getUserById(decoded._id)

    const isMatch = await bcrypt.compare(currentPassword, user.password)
    console.table([newPassword, confirmPassword, isMatch])

    if (!isMatch) {
        req.flash('message', 'Current password is incorrect!')
        return res.redirect('/dashboard/settings')
    }

    if (newPassword.length < 8) {
        req.flash('message', 'New password must be at least 8 characters long!')
        return res.redirect('/dashboard/settings')
    }

    if (newPassword !== confirmPassword) {
        req.flash('message', 'New passwords do not match!')
        return res.redirect('/dashboard/settings')
    }

    const { message } = await updateUserById(user.id, { password: newPassword })
    await createActivity({ actions: `Updated account password`, user_id: decoded._id })

    req.flash('message', message)
    return res.redirect('/dashboard/settings')
})

// dashboard categories page
router.get('/categories', async (req, res) => {
    const token = req.cookies?.token
    const decoded = jwt.verify(token, process.env.MY_SECRET_KEY)
    const { user } = await getUserById(decoded._id)
    const { name: organizingCommitteeName } = await getOrganizingCommitteeById(user.organizing_committee_id)

    const { events = [] } = await getEventsByOrganizingCommitteeId(user.organizing_committee_id)
    console.log(events)

    let postsByCategory = {}
    let categories = []

    if (events.length > 0) {
        const eventIds = events.map(event => event.id)
        const { posts = [] } = await getPostsByEventId(eventIds)

        const allPostswithCategories = await Promise.all(
            posts.map(async post => {
                const { event } = await getEventById(post.event_id)
                const { category } = await getCategoryById(event.category_id)
                return {
                    ...post.get({ plain: true }),
                    category: category.category
                }
            })
        )

        // Group posts by category
        postsByCategory = allPostswithCategories.reduce((acc, post) => {
            const category = post.category
            if (!acc[category]) {
                acc[category] = []
            }
            acc[category].push(post)
            return acc
        }, {})
        categories = Object.keys(postsByCategory)
    }

    res.render('pages/dashboard/categories', {
        layout: 'layouts/dashboardLayout',
        admin: user,
        categories,
        postsByCategory,
        organizingCommitteeName,
    })
})

router.get('/notify/:id', async (req, res) => {
    const message = req.flash('message')[0]
    const userId = req.params.id

    const token = req.cookies?.token
    const decoded = jwt.verify(token, process.env.MY_SECRET_KEY)

    const { user: admin } = await getUserById(decoded._id)
    const { user } = await getUserById(userId)
    const { posts = [] } = await getAllUpcomingPosts()

    if (!user || user.length === 0) {
      req.flash('message', 'No user found!')
      return res.redirect('/dashboard/users')
    }

    if (!posts || posts.length === 0) {
      req.flash('message', 'No upcoming posts found!')
      return res.redirect('/dashboard/users')
    }

    await sendMailToRegisteredUser({
        name: `Event CMS Team`,
        adminEmail: admin.email,
        email: user.email,
        subject: 'Upcoming Shows Notification',
        message: `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
                    <p>Hi ${user.first_name},</p>
                    <p>Here are the upcoming shows:</p>
                    ${posts.map(post => `
                    <div style="margin-bottom: 12px;">
                        <strong>${post.title}</strong><br/>
                        ${post.description}<br/>
                        <span style="color: #555;"><strong>Event:</strong> ${post.events_model.title} | <strong>Date:</strong> ${post.date} | <strong>Time:</strong> ${post.time}</span>
                    </div>
                    `).join('')}
                    <p style="margin-top: 16px;">Regards,<br/>Event CMS Team</p>
                </div>`
    })

    await createActivity({ actions: `Sent upcoming events email to ${user.first_name} (${user.email})`, user_id: decoded._id })

    req.flash('message', `Email successfully sent to ${user.email}!`)
    res.redirect('/dashboard/users')
})

router.get('/notifyAll', async (req, res) => {
  try {
    const token = req.cookies?.token
    const decoded = jwt.verify(token, process.env.MY_SECRET_KEY)

    const { user: admin } = await getUserById(decoded._id)
    const { users } = await getActiveUsers(decoded._id)
    const { posts } = await getAllUpcomingPosts()

    if (!users || users.length === 0) {
      req.flash('message', 'No users found!')
      return res.redirect('/dashboard/users')
    }

    if (!posts || posts.length === 0) {
      req.flash('message', 'No upcoming posts found!')
      return res.redirect('/dashboard/users')
    }

    for (const user of users) {
      const userData = user.dataValues

      await sendMailToRegisteredUser({
        name: `Event CMS Team`,
        adminEmail: admin.email,
        email: userData.email,
        subject: 'Upcoming Events Notification',
        message: `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
                    <p>Hi ${userData.first_name},</p>
                    <p>Here are the upcoming shows:</p>
                    ${posts.map(post => `
                      <div style="margin-bottom: 12px;">
                        <strong>${post.title}</strong><br/>
                        ${post.description}<br/>
                        <span style="color: #555;">
                          <strong>Event:</strong> ${post.events_model.title} |
                          <strong>Date:</strong> ${post.date} |
                          <strong>Time:</strong> ${post.time}
                        </span>
                      </div>`).join('')}
                    <p style="margin-top: 16px;">Regards,<br/>Event CMS Team</p>
                  </div>`
      })

      await createActivity({ actions: `Sent upcoming events email to ${userData.first_name} (${userData.email})`, user_id: decoded._id })
    }

    req.flash('message', 'Emails successfully sent to all active users!')
    res.redirect('/dashboard/users')
  } 
  catch (error) {
    console.error('\nError in /notifyAll!\n', error)
    req.flash('message', 'Something went wrong while sending emails!')
    res.redirect('/dashboard/users')
  }
})


export default router