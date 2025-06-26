import { Booking } from '../models/index.js'

async function createBooking(user_id, post_id) {
  try {
    const existing = await Booking.findOne({ where: { user_id, post_id } })
    if (existing) {
      return { success: false, message: 'Booking already exists!', booking: existing }
    }

    const booking = await Booking.create({
      user_id,
      post_id,
      status: 'Booked'
    })

    return booking
      ? { success: true, message: 'Booking created successfully!', booking }
      : { success: false, message: 'Failed to create booking!' }

  } 
  catch (error) {
    console.error('Exception occurred in createBooking!\n', error)
    return { success: false, message: 'Exception::: Booking creation failed!' }
  }
}

async function getBookingsByUser(user_id) {
  try {
    const bookings = await Booking.findAll({ where: { user_id } })
    return bookings.length
      ? { success: true, bookings }
      : { success: false, message: 'No bookings found!' }
  } 
  catch (error) {
    console.error('Exception occurred in getBookingsByUser!\n', error)
    return { success: false, message: 'Exception::: Failed to get bookings!' }
  }
}

async function getBookingsByPost(post_id) {
  try {
    const bookings = await Booking.findAll({ where: { post_id } })
    return bookings.length
      ? { success: true, bookings }
      : { success: false, message: 'No bookings found for this post!' }
  } 
  catch (error) {
    console.error('Exception occurred in getBookingsByPost!\n', error)
    return { success: false, message: 'Exception::: Failed to get bookings by post!' }
  }
}

async function cancelBooking(user_id, post_id) {
  try {
    const booking = await Booking.findOne({ where: { user_id, post_id } })
    if (!booking) return { success: false, message: 'Booking not found!' }

    booking.status = 'Cancelled'
    await booking.save()

    return { success: true, message: 'Booking cancelled successfully!', booking }
  } 
  catch (error) {
    console.error('Exception occurred in cancelBooking!\n', error)
    return { success: false, message: 'Exception::: Failed to cancel booking!' }
  }
}

async function getBooking(user_id, post_id) {
  try {
    const booking = await Booking.findOne({ where: { user_id, post_id } })
    return booking
      ? { success: true, booking }
      : { success: false, message: 'Booking not found!' }
  } 
  catch (error) {
    console.error('Exception occurred in getBooking!\n', error)
    return { success: false, message: 'Exception::: Failed to fetch booking!' }
  }
}

async function deleteBookingsByUser(user_id) {
  try {
    const bookings = await Booking.findAll({ where: { user_id } });
    if (!bookings.length) return

    await Booking.destroy({ where: { user_id } })
    return
  } 
  catch (error) {
    console.error('Exception occurred in deleteBookingsByUser!\n', error)
  }
}

export {
  createBooking,
  getBookingsByUser,
  getBookingsByPost,
  cancelBooking,
  deleteBookingsByUser,
  getBooking,
}