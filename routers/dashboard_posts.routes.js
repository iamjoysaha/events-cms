import express from 'express'
import dotenv from 'dotenv'

import { createActivity, createImage, createPost, deleteImageById, deleteImagesByPostId, deletePostById, getEventById, getImagesByPostId, getPostsByEventId, getUserById, getViews, updateImageByEventId, updateImageById, updateImageByPostId, updatePostById } from '../controller/index.js'
import { deleteCloudinaryImage, updateCloudinaryImage, upload, uploadImage } from '../services/cloudinary.js'
import { getStatus } from '../services/status.js'

const router = express.Router()
dotenv.config()

// posts page
router.get('/post/:id', async (req, res) => {
    const eventId = Number(req.params.id)
    req.session.eventId = eventId
    const pageNo = parseInt(req.query.pageNo) || 1
    const pageSize = 10

    const sessionUser = req.user
    const message = req.flash('message')[0]

    const { user } = await getUserById(sessionUser._id)
    const { event } = await getEventById(eventId)

    let { posts = [], totalRecords } = await getPostsByEventId(eventId, pageNo, pageSize)
    const totalPages = Math.ceil(totalRecords / pageSize)

    // Apply filters
    const { status, date } = req.query
    if (status) {
        posts = posts.filter(post => post.status === status)
    }
    if (date) {
        posts = posts.filter(post => new Date(post.date).toISOString().split('T')[0] === date)
    }

    // getting image names
    const image_names = {}

    // getting all the views
    const views = {}
    
    for (const post of posts) {
        const { images = [] } = (await getImagesByPostId(post.id)) || {}
        image_names[post.id] = images.map(img => img.file_name)

        const { view } = await getViews(post.id)
        views[post.id] = view
    }
    
    res.render('pages/dashboard/posts', {
        layout:'layouts/dashboardLayout',
        admin: user,
        eventId,
        posts,
        eventName: event.title,
        image_names,
        views,
        notify: message? message : null,
        query: req.query,
        totalPages,
        pageNo,

        // for filters
        selectedStatus: status || '',
        selectedDate: date || ''
    })
})

// create new post
router.post('/post/create/:id', upload.array('images'), async (req, res) => {
    const event_id = Number(req.params.id)
    const sessionUser = req.user
    const { title, description, venue, location, duration, organizedBy, time, date, price } = req.body

    const { post, message } = await createPost({ title, description, venue, time, date, location, duration, organizer: organizedBy, status: getStatus(date, time), price, event_id })

    const files = req.files || []

    // if admin uploads no images
    if (files.length === 0) {
        await createImage({
            file_name: 'default.jpg',
            original_filename: 'default.jpg',
            image_url: 'https://instaily.com/_next/static/media/test.b3910688.jpg',
            size: '0',
            entity_type: 'post',
            entity_id: 2,
            event_id,
            post_id: post.id
        })
    } 
    else { // yes! admin uploads images
        for (const file of files) {
            const { originalname, buffer, size } = file
            const { success, imageData } = await uploadImage({ original_filename: originalname, buffer })

            if (success) {
                await createImage({ file_name: imageData.file_name, original_filename: originalname, image_url: imageData.image_url, size: `${size}`, entity_type: 'post', entity_id: 2, event_id, post_id: post.id })
            }
        }
    }

    await createActivity({ actions: `Created post: ${title}`, user_id: sessionUser._id })

    req.flash('message', message)
    res.redirect(`/dashboard/posts/post/${event_id}`)
})

// delete post with it's associate images from db + cloudinary
router.post('/post/delete/:id', upload.array('images'), async(req, res)=> {
    const event_id = Number(req.session.eventId)
    const post_id = Number(req.params.id)
    const sessionUser = req.user

    const { images = [] } = await getImagesByPostId(post_id) || []  
    for (const img of images) {
        if (img.file_name !== 'default.jpg') {
            await deleteCloudinaryImage(img.file_name)
        }
    }

    await deleteImagesByPostId(post_id)
    const { success, message } = await deletePostById(post_id)
    if(!success) {
        req.flash('message', message)
        return res.redirect(`/dashboard/posts/post/${event_id}`)
    }

    await createActivity({ actions: `Deleted post (ID: ${post_id})`, user_id: sessionUser._id })

    req.flash('message', message)
    return res.redirect(`/dashboard/posts/post/${event_id}`)
})

// update post
router.post('/post/update/:id', upload.array('images'), async (req, res) => {
    const post_id = Number(req.params.id)
    const sessionUser = req.user
    const { title, description, venue, location, duration, organizedBy, time, date, price } = req.body
    const { success, message } = await updatePostById(post_id, { title, description, venue, location, duration, organizer: organizedBy, time, date, status: getStatus(date, time), price })

    if (!success) {
        req.flash('message', message)
        return res.redirect(`/dashboard/posts/post/${req.session.eventId}`)
    }

    const uploadedFiles = req.files || []
    const result = await getImagesByPostId(post_id)
    const existingImages = result?.images || []


    // user has uploaded some images
    if (uploadedFiles.length > 0) {
        const hasOnlyDefaultImage = existingImages.length === 1 && existingImages[0].file_name === 'default.jpg'

        for (const img of existingImages) {
            if (img.file_name !== 'default.jpg') {
                await deleteCloudinaryImage(img.file_name)
                await deleteImageById(img.id)
            } 
            else if (hasOnlyDefaultImage) {
                await deleteImageById(img.id) // Remove only if it's the only image
            }
        }

        for (const file of uploadedFiles) {
            const { success, imageData } = await uploadImage({
                original_filename: file.originalname,
                buffer: file.buffer,
            })

            if (success) {
                await createImage({
                    file_name: imageData.file_name,
                    original_filename: file.originalname,
                    image_url: imageData.image_url,
                    size: `${file.size}`,
                    entity_type: 'post',
                    entity_id: 2, // or your correct static ID
                    event_id: req.session.eventId,
                    post_id,
                })
            }
        }
    }


    await createActivity({ actions: `Updated post "${title}" (ID: ${post_id})`, user_id: sessionUser._id })

    req.flash('message', message)
    res.redirect(`/dashboard/posts/post/${req.session.eventId}`)
})


export default router