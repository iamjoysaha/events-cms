import express from 'express'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'

import { getPostById, getUserById } from '../controller/index.js'
import { createOrder, verifyPayment } from '../services/payment.js'

dotenv.config()
const router = express.Router()

router.get('/:id', async (req, res) => {
    if (!req.cookies.token) {
        req.flash('message', 'Kindly Login or Register Yourself First!')
        return res.redirect('/users/login')
    }

    const postId = req.params.id
    const token = req.cookies.token
    const decoded = jwt.verify(token, process.env.MY_SECRET_KEY)

    const { user } = await getUserById(decoded._id)
    const { post } = await getPostById(postId)

    const { id, amount, currency } = await createOrder(post.price)

    res.render('pages/booking', { post, user, orderId: id, amount,
        keyId: process.env.RAZORPAY_KEY_ID
    })
})

// verifying payment
router.post('/payment/verify', verifyPayment)


export default router