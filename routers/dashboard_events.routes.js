import express from 'express'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'

import { createActivity, createCategory, createEvent, createImage, deleteEventById, deleteImageByEventId, deleteImagesByPostId, deletePostByEventId, deletePostById, getCategories, getCategoryById, getEventById, getEventsByOrganizingCommitteeId, getImageByEventId, getImagesByPostId, getOrganizingCommitteeById, getPostsByEventId, getUserById, updateEventById, updateImageByEventId } from '../controller/index.js'
import { uploadImage, upload, deleteCloudinaryImage, updateCloudinaryImage } from '../services/cloudinary.js'

const router = express.Router()
dotenv.config()

// events page
router.get('/', async (req, res) => {
    const message = req.flash('message')[0]
    const selectedCategory = req.query.category || ''

    const pageNo = parseInt(req.query.pageNo) || 1
    const pageSize = 5

    const token = req.cookies?.token
    const decoded = jwt.verify(token, process.env.MY_SECRET_KEY)
    
    const { user } = await getUserById(decoded._id)
    const { categories } = await getCategories()
    let { events = [], totalRecords } = await getEventsByOrganizingCommitteeId(user.organizing_committee_id, pageNo, pageSize) || {}
    const totalPages = Math.ceil(totalRecords / pageSize)

    const { name: organizingCommitteeName } = await getOrganizingCommitteeById(user.organizing_committee_id)

    // Filter events by category if a category is selected
    if (selectedCategory) {
        events = events.filter(event => event.category_id === parseInt(selectedCategory))
    }
    
    const totalEvents = await Promise.all(events.map(async (event) => {
        const { category } = await getCategoryById(event.category_id)
        const { image, success } = await getImageByEventId(event.id)

        return {
            ...event.get({plain: true}),
            category: category.category,
            image: success? image.image_url : null,
        }
    }))

    res.render('pages/dashboard/events', {
        layout:'layouts/dashboardLayout',
        admin: user,
        categories,
        events: totalEvents,
        organizingCommitteeName,
        selectedCategory,
        notify: message? message : null,
        query: req.query,
        totalPages,
        pageNo,
    })
})

// create new event
router.post('/event/create', upload.single('image'), async(req, res) => {
    const token = req.cookies?.token
    const decoded = jwt.verify(token, process.env.MY_SECRET_KEY)
    const { user } = await getUserById(decoded._id)

    const { title, description, date, category_id, customCategory } = req.body
    let finalCategoryId = category_id

    // if 'other' option, then create new category
    if (category_id === 'Other' && customCategory) {
        const { category } = await createCategory({ category: customCategory })
        finalCategoryId = category.id
    }

    const { event, message } = await createEvent({ title, description, date, category_id: finalCategoryId, organizing_committee_id: user.organizing_committee_id, role_id: decoded.role_id })

    // default image
    let image_url = 'https://instaily.com/_next/static/media/test.b3910688.jpg'
    let file_name = 'default.jpg'
    let original_filename = 'default.jpg'
    let size = '0'

    // if admin uploads an image otherwise default image will be created
    if (req.file) {
        const { success, message, imageData } = await uploadImage({ 
            original_filename: req.file.originalname, 
            buffer: req.file.buffer 
        })

        if(success) {
            file_name = imageData.file_name
            image_url = imageData.image_url
            original_filename = req.file.originalname
            size = `${req.file.size}`
        }
    }

    await createImage({ file_name, original_filename, image_url, size, entity_id: 1, entity_type: 'event', event_id: event.id })

    await createActivity({ actions: `Created new folder: ${title}`, user_id: decoded._id })

    req.flash('message', message)
    res.redirect('/dashboard/events')
})

// delete event and it's associate image
router.post('/event/delete/:id', async (req, res) => {
    const eventId = Number(req.params.id)
    const sessionUser = req.user

    const { event } = await getEventById(eventId)

    const { image, success } = await getImageByEventId(eventId)
    if (success && image?.file_name && image.file_name !== 'default.jpg') {
        await deleteCloudinaryImage(image.file_name)
    }
    await deleteImageByEventId(eventId)

    // delete all the posts of this event with all post images
    const { posts = [] } = await getPostsByEventId(eventId)
    for (const post of posts) {
        const { images = [] } = await getImagesByPostId(post.id)
        for (const img of images) {
            if (img?.file_name) {
                await deleteCloudinaryImage(img.file_name)
            }
        }

        await deleteImagesByPostId(post.id)
        await deletePostById(post.id)
    }

    await createActivity({
        actions: `Deleted folder "${event?.title || 'Untitled'}" (ID: ${eventId}) along with ${posts.length} post(s) and their images.`,
        user_id: sessionUser._id
    })
    
    const { message } = await deleteEventById(eventId)
    req.flash('message', message)
    res.redirect('/dashboard/events')
})

// update event
router.post('/event/update/:id', upload.single('image'), async (req, res) => {
    const eventId = Number(req.params.id)
    const sessionUser = req.user

    const { user } = await getUserById(sessionUser._id)
    const { events } = await getEventsByOrganizingCommitteeId(user.organizing_committee_id)
    const targetEvent = events.find(event => event.id === parseInt(eventId))

    if (!targetEvent) {
        req.flash('message', 'Folder not found!')
        return res.redirect('/dashboard/events')
    }

    const { title, description, date, category_id, customCategory } = req.body
    let finalCategoryId = category_id

    if (category_id === 'Other' && customCategory) {
        const { category } = await createCategory({ category: customCategory })
        finalCategoryId = category.id
    }

    await updateEventById(targetEvent.id, { title, description, date, category_id: finalCategoryId })

    // only if user uploads an image
    if (req.file) {
        const { image } = await getImageByEventId(eventId)
        const { success , imageData } = await updateCloudinaryImage({
            old_file_name: image.file_name,
            original_filename: req.file.originalname,
            buffer: req.file.buffer
        })

        if (success) {
            await updateImageByEventId(eventId, {
                file_name: imageData.file_name,
                original_filename: req.file.originalname,
                image_url: imageData.image_url,
                size: `${req.file.size}`,
                entity_id: 1,
                entity_type: 'event',
                event_id: eventId
            })
        }
    }

    await createActivity({ actions: `Updated folder "${title}" (ID: ${eventId})`, user_id: sessionUser._id })

    req.flash('message', 'Folder updated successfully!')
    res.redirect('/dashboard/events')
})


export default router