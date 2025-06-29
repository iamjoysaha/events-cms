import { Op } from 'sequelize'
import moment from 'moment'
import { Events, Posts, Users, Category } from '../models/index.js'
import { sendMailToRegisteredUser } from '../services/mail.js'
import { formatDate, formatTime } from '../services/formatter.js'

async function createEvent({title, description, date, category_id, organizing_committee_id, role_id}) {
    if (!title || !date || !category_id || !organizing_committee_id || !role_id) {
        return { success: false, message: 'Missing required event fields!' }
    }

    try {
        const event = await Events.create({title, description, date, category_id, organizing_committee_id, role_id})
        return { success: true, message: 'Folder created!', event }
    }
    catch(error) {
        console.error('Exception occurred inside createEvent!\n', error)
        return { success: false, message: 'Exception::: Folder creation failed!' }
    }
}

async function deleteEventById(id) {
    try {
        const event = await Events.destroy({ where: { id }})
        return { success: true, message: 'Folder deleted!' }
    }
    catch (error) {
        console.log('Exception occured inside deleteEventById!\n', error)
        return { success: false, message: 'Exception::: Unable to delete folder or folder not found!'}
    }
}

async function deleteEventByOrganizingCommitteeId(organizing_committee_id) {
    try {
        const event = await Events.destroy({ where: { organizing_committee_id }})
        return { success: true, message: 'Folder deleted!' }
    }
    catch (error) {
        console.log('Exception occured inside deleteEventByOrganizingCommitteeId!\n', error)
        return { success: false, message: 'Exception::: Unable to delete folder or folder not found!'}
    }
}

async function updateEventById(id, updates) {
    try {
        const [status] = await Events.update(updates, { where: { id } })

        if (!status) {
            return { success: false, message: 'Event not found or nothing to update.' }
        }

        const updatedEvent = await Events.findByPk(id)
        return { success: true, message: 'Folder updated successfully!', updatedEvent }

    } 
    catch (error) {
        console.error('Exception occurred inside updateEventById!\n', error)
        return { success: false, message: 'Exception::: Unable to update folder!' }
    }
}

async function getEventsByCategoryId(category_id) {
    try {
        const events = await Events.findAll({ where: { category_id } })
        return events.length ? { success: true, events } : 
                               { success: false, message: 'Folders not found!' }
    } 
    catch (error) {
        console.error('Exception occurred inside getEventsByCategoryId!\n', error)
        return { success: false, message: 'Exception::: Folders not found!' }
    }
}

async function getEventsByOrganizingCommitteeId(organizing_committee_id, pageNo = 1, pageSize = 50) {
    try {
        const { count, rows: events} = await Events.findAndCountAll({ 
            where: { organizing_committee_id }, 
            limit: pageSize,
            offset: (pageNo - 1) * pageSize
        })

        if(!events || !events.length) {
            return { success: false, message: 'Folders not found!'}
        }
    
        return { success: true, events, totalRecords: count }
    }
    catch(error) {
        console.log('Exception occured inside getEventsByOrganizingCommitteeId!\n', error)
        return { success: false, message: 'Exception::: Folders not found!'}
    }
}

async function getEventsByRoleId(role_id) {
    try {
        const events = await Events.findAll({ where: { role_id } })
    
        if(!events || !events.length) {
            return { success: false, message: 'Folders not found!'}
        }
    
        return { success: true, events }
    }
    catch (error) {
        console.error('Exception occurred inside getEventsByRoleId!\n', error)
        return { success: false, message: 'Exception::: Folders not found!'}
    }

}

async function getEventById(id) {
    try {
        const event = await Events.findByPk(id)

        return event ? 
            { success: true, event } : 
            { success: false, message: 'Folder not found!' }
    }
    catch(error) {
        console.error('Exception occurred inside getEventById!\n', error)
        return { success: false, message: 'Exception::: Folder not found!'}
    }
}

async function getAllEvents(pageNo = 1, pageSize = 50) {
    try {
        const { count, rows: events } = await Events.findAndCountAll({ 
            limit: pageSize, 
            offset: (pageNo - 1) * pageSize,
        })
    
        if(!events || !events.length) {
            return { success: false, message: 'Folders not found!'}
        }
    
        return { success: true, events, totalRecords: count }
    }
    catch (error) {
        console.error('Exception occurred inside getAllEvents!\n', error)
        return { success: false, message: 'Exception::: Folders not found!'}
    }
}


async function getEventsByYear(id, date) {
    if (!date || !date.includes('/')) {
        return { success: false, message: 'Invalid date format!' }
    }

    try {
        const response = await Events.findByPk(id)

        if (!response.success || !response.events.length) {
            return { success: false, message: 'No folders found for given ID' }
        }

        const targetYear = date.split('/')[2] // date -> 17/05/2025 -> 2025
        const filteredEvents = response.events.filter(event => {
            const eventYear = new Date(event.date).getFullYear().toString()
            return eventYear === targetYear
        })

        return { success: true, filteredEvents }
    }
    catch(error) {
        console.log('Exception occured inside getEventsByYear!\n', error)
        return { success: false, message: 'Exception::: No folders found for given ID!' }
    }
}

async function sendUpcomingEventEmails() {
  try {
    const today = moment().format('YYYY-MM-DD')
    // Fetch all upcoming events for today
    const upcomingEvents = await Posts.findAll({ where: { status: 'upcoming', date: { [Op.eq]: today } } })
    if (!upcomingEvents.length) return; // No events for today

    const registeredActiveUsers = await Users.findAll({ where: { role_id: 2, status: 1 } })
    if (!registeredActiveUsers.length) return // No active users

    const eventList = upcomingEvents.map(event => {
      return `<li><strong>${event.title}</strong><br>
                  Date: ${formatDate(event.date)}<br>
                  Time: ${formatTime(event.time)}<br>
                  Venue: ${event.venue || 'To be announced'}</li>`
    }).join('')

    const emailMessage = `<p>Hello <strong>{{firstName}} {{lastName}}</strong>,</p>
                          <p>We hope you're doing well! This is a friendly reminder about the upcoming shows for today:</p>
                          <ul>${eventList}</ul>
                          <p>Make sure to mark your calendar — we’d love to see you there!</p>
                          <p>Best regards,<br>Events CMS Team</p>`

    for (const user of registeredActiveUsers) {
      await sendMailToRegisteredUser({
        name: `Event CMS Team`,
        adminEmail: null,
        email: user.email,
        subject: `Today's Upcoming Events`,
        message: emailMessage.replace('{{firstName}}', user.first_name).replace('{{lastName}}', user.last_name)
      })
    }
  }
  catch (error) {
    console.error('\n:::: Error sending upcoming event emails to registered users! ::::\n', error)
  }
}

async function getEventsByDateRange(startDate, endDate) {
  try {
    const events = await Events.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate]
        }
      }
    })
    return events.length ? { success: true, events } : { success: false, message: 'No events found!' }
  } 
  catch (error) {
    console.error('Exception in getEventsByDateRange:\n', error)
    return { success: false, message: 'Error fetching events by date' }
  }
}

async function getEventsByCategoryName(categoryName) {
  try {
    const category = await Category.findOne({ where: { category: categoryName } })
    if (!category) return { success: false, message: 'Category not found' }

    const events = await Events.findAll({ where: { category_id: category.id } })
    return events.length ? { success: true, events } : { success: false, message: 'No events found for this category' }
  } 
  catch (error) {
    console.error('Error in getEventsByCategoryName:\n', error)
    return { success: false, message: 'Exception occurred while fetching events by category' }
  }
}

export {
    createEvent,
    deleteEventById,
    deleteEventByOrganizingCommitteeId,
    updateEventById,

    getEventById,
    getEventsByCategoryId,
    getEventsByOrganizingCommitteeId,
    getEventsByRoleId,
    getEventsByYear,
    getAllEvents,

    sendUpcomingEventEmails,
    getEventsByDateRange,
    getEventsByCategoryName,
}