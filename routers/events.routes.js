import express from 'express'
import { formatDate, formatTime } from '../services/formatter.js'
import { createViews, getAllPosts, getAllPostsExceptThisId, getBooking, getCategories, getCategoryById, getEventById, getImagesByPostId, getImageUrlByEventId, getOrganizingCommitteeById, getOrganizingCommittees, getPostById, getPostsByEventId, getRoleNameById, getRoles, getUserById, getViews } from '../controller/index.js'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'

dotenv.config()
const router = express.Router()

// events page
router.get('/', async (req, res) => {
  const message = req.flash('message')[0]

  const { posts: allPostsRaw = [] } = await getAllPosts() // Safe default

  const { categories = [] } = await getCategories()
  const { organizingCommitties = [] } = await getOrganizingCommittees()
  const statuses = [...new Set(allPostsRaw.map(post => post.status))]
  const years = [...new Set(allPostsRaw.map(post => post.date.split('-')[0]))]

  const allPosts = await Promise.all(
    allPostsRaw.map(async post => {
      const { images = [] } = await getImagesByPostId(post.id)
      const { event } = await getEventById(post.event_id)
      const { category } = await getCategoryById(event.category_id)
      const { name } = await getOrganizingCommitteeById(event.organizing_committee_id)

      return {
        ...post.get({ plain: true }),
        images: images.map(img => img.get({ plain: true })),
        event: event.get({ plain: true }),
        category: category.category,
        category_id: event.category_id,
        OrganizerCommitteeName: name
      }
    })
  )

  // Extract filters from query
  const selectedCategories = req.query.category ? [].concat(req.query.category) : []
  const selectedStatuses = req.query.status ? [].concat(req.query.status) : []
  const selectedYears = req.query.year ? [].concat(req.query.year) : []
  const selectedOrganizers = req.query.organizer ? [].concat(req.query.organizer) : []

  // Filter posts
  const filteredPosts = allPosts.filter(post => {
    const matchCategory = selectedCategories.length ? selectedCategories.includes(String(post.category_id)) : true
    const matchStatus = selectedStatuses.length ? selectedStatuses.includes(post.status) : true
    const matchYear = selectedYears.length ? selectedYears.includes(post.date.split('-')[0]) : true
    const matchOrganizer = selectedOrganizers.length ? selectedOrganizers.includes(String(post.event.organizing_committee_id)) : true
    return matchCategory && matchStatus && matchYear && matchOrganizer
  })

  // Pagination
  const pageNo = parseInt(req.query.pageNo) || 1
  const pageSize = 20
  const totalRecords = filteredPosts.length
  const totalPages = Math.ceil(totalRecords / pageSize)
  const startIndex = (pageNo - 1) * pageSize
  const paginatedPosts = filteredPosts.slice(startIndex, startIndex + pageSize)

  res.render('pages/events', {
    filteredPosts: paginatedPosts,
    totalPages,
    pageNo,
    notify: message || null,
    query: req.query,
    categories,
    statuses,
    years,
    organizingCommitties,
    formatDate,
    formatTime
  })
})

// events details page
router.get('/:id', async (req, res) => {
  const eventId = Number(req.params.id)

  const pageNo = parseInt(req.query.pageNo) || 1
  const pageSize = 10

  const { event } = await getEventById(eventId)
  const { category } = await getCategoryById(event.category_id)
  const { image } = await getImageUrlByEventId(event.id)
  const { name: organizer } = await getOrganizingCommitteeById(event.organizing_committee_id)

  let { posts = [] } = await getPostsByEventId(eventId)

  let postsWithImages = await Promise.all(
    posts.map(async post => {
      const { images = [] } = await getImagesByPostId(post.id)
      return {
        ...post.get({ plain: true }),
        images: images.map(img => img.get({ plain: true }))
      }
    })
  )

  const totalRecords = postsWithImages.length
  const totalPages = Math.ceil(totalRecords / pageSize)
  const start = (pageNo - 1) * pageSize
  const end = start + pageSize
  postsWithImages = postsWithImages.slice(start, end)

  res.render('pages/event_details', { 
    event, 
    category, 
    image, 
    organizer, 
    postsWithImages,
    query: req.query,
    totalPages,
    pageNo,
  })
})

// An event's post page
router.get('/posts/post/:id', async (req, res) => {
  const notify = req.flash('message')[0] || req.query.notify

  let user = null
  let booking = null
  const token = req.cookies?.token

  try {
    if (token) {
      const decoded = jwt.verify(token, process.env.MY_SECRET_KEY)
      const result = await getUserById(decoded._id)
      user = result.user
    }
  } catch (err) {
    console.error('JWT error:', err.message)
  }

  const postId = req.params.id
  const pageNo = parseInt(req.query.pageNo) || 1
  const pageSize = 8

  const { post } = await getPostById(postId)
  const { images } = await getImagesByPostId(post.id)

  if (user) {
    const result = await getBooking(user.id, postId)
    booking = result.booking
  }

  const { posts = [], totalRecords } = await getAllPostsExceptThisId(post.id, pageNo, pageSize)
  const totalPages = Math.ceil(totalRecords / pageSize)

  const postsWithImages = await Promise.all(
    posts.map(async post => {
      const { images = [] } = await getImagesByPostId(post.id)
      const { event } = await getEventById(post.event_id)
      const { name } = await getOrganizingCommitteeById(event.organizing_committee_id)

      return {
        ...post.get({ plain: true }),
        images: images.map(img => img.get({ plain: true })),
        event: event.get({ plain: true }),
        OrganizerCommitteeName: name,
      }
    })
  )

  const { organizingCommitties } = await getOrganizingCommittees()
  const { roles = [] } = await getRoles()

  await createViews(postId)
  const { view } = await getViews(postId)

  res.render('pages/post', {
    user,
    roles,
    view,
    organizingCommitties,
    post: post || null,
    images: images || [],
    postsWithImages,
    query: req.query,
    totalPages,
    pageNo,
    notify,
    bookNowBtnStatus: booking ? booking.status : 'Book Now',
  })
})

export default router