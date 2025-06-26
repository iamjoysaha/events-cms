import express from 'express'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { isAuthenticated, isUser } from '../middleware/auth.js'
import {
    createUser,
    deleteUserById,
    createOrganizingCommittee,
    getOrganizingCommitteeById,
    getOrganizingCommittees,
    getRoleNameById,
    getRoles,
    getUser,
    getUserById,
    isAdminExistsForCommittee,
    getEventsByOrganizingCommitteeId,
    deleteEventById,
    deletePostById,
    deleteImagesByPostId,
    getImagesByPostId,
    getPostsByEventId,
    deleteImageByEventId,
    getImageByEventId,
    deleteActivityByUserId,
    deleteBookingsByUser,
} from '../controller/index.js'
import { deleteCloudinaryImage } from '../services/cloudinary.js'

dotenv.config()
const router = express.Router()

// registration page
router.get('/register', async (req, res) => {
    const notify = req.flash('message')[0]

    const { organizingCommitties, success, message } = await getOrganizingCommittees()
    const rolesResult = await getRoles()
    const roles = rolesResult.success ? rolesResult.roles : []

    res.render('pages/registration', { organizingCommitties, roles, notify })
})

// create new user
router.post('/create', async (req, res) => {
    const { first_name, last_name, email, password, username, organizing_committee_id, new_organizing_committee, role_id } = req.body

    let finalOrganizingCommitteeId = organizing_committee_id

    // if user chooses 'other' option
    if (organizing_committee_id === 'other' && new_organizing_committee?.trim()) {
        const capitalizedName = new_organizing_committee.trim().toLowerCase().split(' ').filter(word => word.length > 0).map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)).join(' ')

        const { organizingCommittee, message, success } = await createOrganizingCommittee({ name: capitalizedName })

        if (!success) {
            req.flash('message', message)
            return res.redirect('/users/register')
        }

        finalOrganizingCommitteeId = organizingCommittee.id
    }

    // check if admin for that organization is already there? if so, then return to register page with msg!
    if(role_id === '1') { // only if user try to register as admin
        const {success, message: specialMsg} = await isAdminExistsForCommittee(finalOrganizingCommitteeId)
        if(success) { // admin exists!
            req.flash('message', specialMsg)
            return res.redirect('/users/register')
        }
    }

    const { message } = await createUser({ first_name, last_name, email, password, username, status: 1, is_owner: true, organizing_committee_id: finalOrganizingCommitteeId, role_id })
    
    req.flash('message', message)
    res.redirect(`/users/register`)
})

// profile page only for users
router.get('/user/:id', isAuthenticated, isUser, async (req, res) => {
    const id = parseInt(req.params.id)
    const sessionUser = req.user

    if(id !== sessionUser._id) {
        return res.redirect(`/users/user/${sessionUser._id}`)
    }

    const { user } = await getUserById(id)
    const { name } = await getOrganizingCommitteeById(user.organizing_committee_id)
    const { role } = await getRoleNameById(user.role_id)
    if (role === 'admin') {
        return res.redirect(`/users/user/${sessionUser._id}`)
    }
    
    res.render('pages/user', { user, name, role })
})

// login
router.post('/login', async (req, res) => {
    const { email, password } = req.body
    const { user, success, message } = await getUser({ email, password })

    if (!success) {
        req.flash('message', message)
        return res.redirect('/users/login')
    }

    req.session.user = { id: user.id, email: user.email, role_id: user.role_id, organizing_committee_id: user.organizing_committee_id }

    const token = jwt.sign({ _id: user.id, email: user.email, role_id: user.role_id, organizing_committee_id: user.organizing_committee_id }, process.env.MY_SECRET_KEY, { expiresIn: '24h' })
    res.cookie('token', token, { maxAge: 24 * 60 * 60 * 1000 })

    req.flash('message', message)
    return res.redirect('/')
})

// login page
router.get('/login', (req, res) => {
    const notify = req.flash('message')[0]

    res.clearCookie('connect.sid')
    res.clearCookie('token')
    res.setHeader('Cache-Control', 'no-store')

    res.render('pages/login', { notify })
})

// logout
router.all('/logout', (req, res) => { // TODO: NOT DESTROYING SESSION FOR NOW!
  req.flash('message', 'Logged out successfully!')

  res.clearCookie('connect.sid')
  res.clearCookie('token')
  res.redirect('/users/login')
})

// delete only user
router.post('/delete/user/:id', async (req, res) => {
    const userId = req.params.id
    const { user, userMsg } = await getUserById(userId)

    if (!user) {
        req.flash('message', userMsg)
        return res.redirect(`/users/user/${userId}`)
    }

    await deleteBookingsByUser(user.id)
    const { message } = await deleteUserById(user.id)

    req.flash('message', message)
    return res.redirect('/users/login')
})

// This is only for admin
// if suppose, admin deleted his profile so, it's associate events and posts gonna be deleted!
router.post('/delete/:id', async (req, res) => {
    const userId = req.params.id
    const sessionUser = req.user
    const { user, message: userMsg } = await getUserById(userId)

    if (!user) {
        req.flash('message', userMsg)
        return res.redirect('/dashboard/settings')
    }

    const { events = [] } = await getEventsByOrganizingCommitteeId(user.organizing_committee_id) || {}
    for (const event of events) {
        const { image, success } = await getImageByEventId(event.id)
        if (success && image?.file_name && image.file_name !== 'default.jpg') {
            await deleteCloudinaryImage(image.file_name)
        }
        await deleteImageByEventId(event.id)

        const { posts = [] } = await getPostsByEventId(event.id)
        for (const post of posts) {
            const { images = [] } = await getImagesByPostId(post.id)
            for (const img of images) {
                if (img?.file_name && img.file_name !== 'default.jpg') {
                    await deleteCloudinaryImage(img.file_name)
                }
            }
            await deleteImagesByPostId(post.id)
            await deletePostById(post.id)
        }

        await deleteEventById(event.id)
    }

    await deleteBookingsByUser(user.id)
    const { success, message } = await deleteUserById(user.id)

    if (!success) {
        req.flash('message', message)
        return res.redirect('/dashboard/settings')
    }

    await deleteActivityByUserId(sessionUser._id)

    req.flash('message', message)
    res.clearCookie('token')
    return res.redirect('/users/login')
})


export default router
