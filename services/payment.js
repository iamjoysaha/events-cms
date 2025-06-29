import razorpay from '../config/razorpay.js'
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { createActivity, createBooking, getPostById, getUserById } from '../controller/index.js'
import { getNotified } from './mail.js'
dotenv.config()

const createOrder = async (amount) => {
  try {
    const order = await razorpay.orders.create({
        amount: amount * 100,
        currency: 'INR',
        receipt: `receipt_order_${Date.now()}`,
    })

    return { id: order.id, amount: order.amount, currency: order.currency }
  } 
  catch (error) {
    console.error('\n:::: Exception occurred inside createOrder!\n', error)
  }
}

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, postId } = req.body
    const token = req.cookies.token

    if (!token) return res.status(401).json({ status: 'unauthorized' })

    const decoded = jwt.verify(token, process.env.MY_SECRET_KEY)
    const userId = decoded._id
    const { user } = await getUserById(userId)
    const { post } = await getPostById(postId)

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET_KEY)
      .update(body)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ status: 'failed', message: 'Signature mismatch!' })
    }

    // Create booking after payment is verified
    const result = await createBooking(userId, postId)

    if (result.success) {
      setImmediate(() => {
        getNotified({
         name: `Event CMS Team`,
         email: user.email,
         subject: `Booking Confirmed: ${post.title}`,
         message: `<p>Hi ${user.first_name},</p>
             <p>Your booking for the event "<strong>${post.title}</strong>" has been successfully confirmed!</p>
             <p>Your have succesfully paid <strong>Rs. ${post.price}</strong> only.</p>
             <p><strong>Show Details:</strong><br>${post.description}</p>
             <p>We look forward to your participation and hope you have a great experience!</p>
             <p>If you have any questions, feel free to reply to this email.</p>
             <p>Best regards,<br><strong>Events CMS Team</strong></p>`
         })
      })

      const { activity } = await createActivity({
        actions: `Confirmed booking for show "${post.title}"(Post ID: ${postId}) by ${user.first_name} ${user.last_name} — Payment ID: ${razorpay_payment_id} and Order ID: ${razorpay_order_id}`,
        user_id: decoded._id
      })

      console.log(activity)

      return res.json({ status: 'success', message: result.message })
    } 
    else {
      return res.status(400).json({ status: 'failed', message: result.message })
    }

  } 
  catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
}

export {
    createOrder,
    verifyPayment,
}
