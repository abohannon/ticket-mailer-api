import sgMail from '../config/sendgrid'

// Generate recipient-specific variables.
export const generatePersonalizations = orders => new Promise((resolve, reject) => {
  if (!orders) return reject(new Error('Invalid input'))

  const personalizations = orders.map(order => ({
    to: order.email,
    dynamic_template_data: {
      name: order.name,
      order_number: order.orderNumber,
      bundle_qty: order.quantity,
    },
  }))

  return resolve(personalizations)
})

export const sendSingleEmail = async (message) => {
  if (!message) throw new Error('Message object required to send email')

  const response = await sgMail.send(message)

  return response
}

export const sendAccountVerificationEmail = async (email, token) => {
  const verificationLink = `${process.env.HOST_URL}/verifyEmail?token=${token}`
  console.log(verificationLink)

  const message = {
    to: email,
    from: 'no-reply@showstubs.com',
    subject: 'Please verify your email.',
    html: `<p>To finish creating your Ticket Mailer account, please verify your email address by clicking <a href=${verificationLink}>here</a>.</p>`,
  }

  const response = await sendSingleEmail(message)

  return response
}
