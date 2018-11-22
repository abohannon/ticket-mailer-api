import moment from 'moment'
import Email from '../models/email'
import sgMail from '../config/sendgrid'
import { generatePersonalizations } from '../services/emailService'
import {
  fetchMetafields, searchMetafields, createMetafield, updateMetafieldsForOrders,
} from '../services/dataService'

// TODO: WIP
export const parseEmailWebhooks = (req, res) => {
  const { events } = req.body

  console.log(req.body)
}

export const sendTicketEmail = async (req, res) => {
  const {
    content, orders, showTitle, variantTitle, artistName,
  } = req.body

  const {
    check_in,
    digital_delivery_date,
    digital_items,
    event_notes,
    pickup_items,
    shipping_date,
    shipping_items,
    start_time,
    variant_id,
  } = content

  try {
    const personalizations = await generatePersonalizations(orders)

    const message = {
      personalizations,
      from: { email: 'no-reply@showstubs.com', name: 'SHOWstubs' },
      template_id: 'd-3027cf5726c041139347607731e6de9d',
      dynamic_template_data: {
        subject: `Your SHOWstubs Ticket for ${showTitle}`,
        bundle_title: variantTitle,
        artist: artistName,
        show_title: showTitle,
        check_in: moment(check_in).format('h:m a'),
        start_time: moment(start_time).format('h:m a'),
        event_notes,
        pickup_items,
        shipping_items,
        shipping_date: moment(shipping_date).format('M/D/Y'),
        digital_items,
        digital_delivery_date: moment(digital_delivery_date).format('M/D/Y'),
      },
    }

    const response = await sgMail.sendMultiple(message)

    if (response[0].statusCode !== 202) throw new Error('Problem sending email. Did not receive 202 response.')

    const variantMetafields = await fetchMetafields('variant', variant_id)
    const priorEmailSentMetafield = searchMetafields(variantMetafields, 'key', 'email_sent')

    if (priorEmailSentMetafield.length < 1) {
      const metafieldData = {
        key: 'email_sent',
        value: 'true',
        value_type: 'string',
        namespace: 'email',
        owner_resource: 'variant',
        owner_id: variant_id,
      }

      await createMetafield(metafieldData)
    }

    await updateMetafieldsForOrders(orders)

    return res.status(200).json(response)
  } catch (err) {
    console.log(err.toString())
    return res.status(500).json({ error: err.message, sendGrid_error: err.response })
  }
}

export const saveEmail = async (req, res) => {
  const { variant_id } = req.body

  try {
    const email = await Email.findOneAndUpdate({ variant_id }, req.body, { upsert: true, new: true })

    if (!email) {
      throw new Error('Error saving email')
    }

    return res.status(201).json(email)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const fetchEmail = async (req, res) => {
  const { variant_id } = req.query

  try {
    const foundEmail = await Email.findOne({ variant_id })

    let response = foundEmail

    if (!foundEmail) {
      response = { error: 'No email found' } // successful request, but no content found
    }

    return res.status(200).json(response)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
