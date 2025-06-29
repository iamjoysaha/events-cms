import express from 'express'
import moment from 'moment'
import { getChatCompletion } from '../services/groq.js'
import { formatTime, formatDate } from '../services/formatter.js'
import {
  getAllUpcomingPosts,
  getCategories,
  getEventsByCategoryName,
  getEventsByDateRange,
  getOrganizingCommittees,
  getPostsByOrganizerName,
  getPostsByStatus,
} from '../controller/index.js'
const router = express.Router()

router.post('/chat', async (req, res) => {
  const { message } = req.body
  if (!message) return res.status(400).json({ error: 'Message is required' })

  const lower = message.toLowerCase()
  let reply = '<p>❗Sorry, I couldn’t find anything matching that!</p>'

  try {
    // --- Match: Upcoming Events ---
    if (lower.includes('upcoming')) {
      const { success, posts } = await getAllUpcomingPosts()
      if (success && posts.length) {
        reply = posts.map(p =>
          `<div class="event-card">
            <strong>🎉 ${p.title}</strong><br/>
            📍 <strong>Venue:</strong> ${p.venue || 'TBD'}<br/>
            🗓️ <strong>Date:</strong> ${formatDate(p.date) || 'TBD'}<br/>
            ⏰ <strong>Time:</strong> ${formatTime(p.time) || 'TBD'}<br/>
            👥 <strong>Organizer:</strong> ${p.organizer || 'Unknown'}<br/>
            🔗 <a href="/events/posts/post/${p.id}" class="text-blue-600 underline">View Event</a>
          </div>`
        ).join('<hr class="my-3"/>')
        return res.json({ reply })
      }
    }

    // --- Match: Status (Ongoing/Completed) ---
    if (['ongoing', 'completed'].some(status => lower.includes(status))) {
      const status = lower.includes('ongoing') ? 'ongoing' : 'completed'
      const { success, posts } = await getPostsByStatus(status)
      if (success && posts.length) {
        reply = posts.map(p =>
          `<div class="event-card">
            <strong>📌 ${p.title}</strong><br/>
            🗓️ <strong>Date:</strong> ${formatDate(p.date) || 'TBD'}<br/>
            ⏰ <strong>Time:</strong> ${formatTime(p.time) || 'TBD'}<br/>
            📍 <strong>Venue:</strong> ${p.venue || 'TBD'}<br/>
            🔖 <strong>Status:</strong> ${p.status}<br/>
            🔗 <a href="/events/posts/post/${p.id}" class="text-blue-600 underline">View Post</a>
          </div>`
        ).join('<hr class="my-3"/>')
        return res.json({ reply })
      }
    }

    // --- Match: Organizer ---
    const orgRes = await getOrganizingCommittees()
    const knownOrganizers = orgRes?.success ? orgRes.organizers || [] : []
    const organizerMatch = knownOrganizers.find(o => lower.includes(o.toLowerCase()))
    if (organizerMatch) {
      const { success, posts } = await getPostsByOrganizerName(organizerMatch)
      if (success && posts.length) {
        reply = posts.map(p =>
          `<div class="event-card">
            <strong>🎉 ${p.title}</strong><br/>
            📍 <strong>Venue:</strong> ${p.venue || 'TBD'}<br/>
            🗓️ <strong>Date:</strong> ${formatDate(p.date) || 'TBD'}<br/>
            ⏰ <strong>Time:</strong> ${formatTime(p.time) || 'TBD'}<br/>
            👥 <strong>Organizer:</strong> ${p.organizer || 'Unknown'}<br/>
            🔗 <a href="/events/posts/post/${p.id}" class="text-blue-600 underline">View Event</a>
          </div>`
        ).join('<hr class="my-3"/>')
        return res.json({ reply })
      }
    }

    // --- Match: Category ---
    const catRes = await getCategories()
    if (catRes.success) {
      const knownCategories = catRes.categories.map(c => c.category.toLowerCase())
      const matchedCategory = knownCategories.find(cat => lower.includes(cat))
      if (matchedCategory) {
        const events = await getEventsByCategoryName(matchedCategory)
        if (events.success && events.events.length) {
          reply = events.events.map(e =>
            `<div class="event-card">
              <strong>🏷️ ${e.title}</strong><br/>
             🗓️ <strong>Date:</strong> ${formatDate(e.date) || 'TBD'}<br/>
              📍 <strong>Venue:</strong> ${e.venue || 'TBD'}<br/>
              🔗 <a href="/events/posts/post/${e.id}" class="text-blue-600 underline">View Post</a>
            </div>`
          ).join('<hr class="my-3"/>')
          return res.json({ reply })
        } else {
          reply = `<p>No shows found for the <strong>${matchedCategory}</strong> category.</p>`
          return res.json({ reply })
        }
      }
    }

    // --- Match: Tomorrow's Events ---
    if (lower.includes('tomorrow')) {
      const tomorrow = moment().add(1, 'days').format('YYYY-MM-DD')
      const events = await getEventsByDateRange(tomorrow, tomorrow)
      if (events.success && events.events.length) {
        reply = `<strong>🔔 Events for Tomorrow:</strong><br/><br/>` +
        events.events.map(e =>
          `<div class="event-card">
            <strong>⏰ ${e.title}</strong><br/>
            🗓️ <strong>Date:</strong> ${formatDate(e.date) || 'TBD'}<br/>
            📍 <strong>Venue:</strong> ${e.venue || 'TBD'}<br/>
            🔗 <a href="/events/posts/post/${e.id}" class="text-blue-600 underline">View Post</a>
          </div>`
        ).join('<hr class="my-3"/>')
        return res.json({ reply })
      } else {
        reply = `<p>No shows found for tomorrow.</p>`
        return res.json({ reply })
      }
    }

    // --- Match: Next Month's Events ---
    if (lower.includes('next month')) {
      const start = moment().add(1, 'month').startOf('month').format('YYYY-MM-DD')
      const end = moment().add(1, 'month').endOf('month').format('YYYY-MM-DD')
      const events = await getEventsByDateRange(start, end)
      if (events.success && events.events.length) {
        reply = events.events.map(e =>
          `<div class="event-card">
            <strong>📅 ${e.title}</strong><br/>
            🗓️ <strong>Date:</strong> ${formatDate(e.date) || 'TBD'}<br/>
            📍 <strong>Venue:</strong> ${e.venue || 'TBD'}<br/>
            🔗 <a href="/events/posts/post/${e.id}" class="text-blue-600 underline">View Post</a>
          </div>`
        ).join('<hr class="my-3"/>')
        return res.json({ reply })
      } else {
        reply = `<p>No shows found for next month.</p>`
        return res.json({ reply })
      }
    }

    // --- Fallback: AI Completion ---
    const ai = await getChatCompletion(message)
    reply = ai.choices[0]?.message?.content || reply
    res.json({ reply })

  } 
  catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({ error: 'Something went wrong' })
  }
})

export default router
