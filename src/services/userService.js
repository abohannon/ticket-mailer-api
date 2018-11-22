import sgMail from '../config/sendgrid'

export const sendUpdatedUserEmail = async (options) => {
  const { newEmail, name } = options

  const newEmailMsg = {
    to: newEmail,
    from: 'no-reply@showstubs.com',
    subject: 'Email updated for SHOWstubs Ticket Mailer',
    html: `<p>${name} your email was successfully updated.</p>`,
    category: 'email-update-success',
  }

  const response = await sgMail.send(newEmailMsg)

  return response
}
