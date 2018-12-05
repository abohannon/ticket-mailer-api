import moment from 'moment'
import Email from '../models/email'
import sgMail from '../config/sendgrid'
import { logger } from '../helpers/utils'
import { generatePersonalizations } from '../services/emailService'
import {
  fetchMetafields, searchMetafields, createMetafield, updateMetafieldsForOrders,
} from '../services/dataService'

// TODO: WIP
export const parseEmailWebhooks = (req, res) => {
  const { events } = req.body

  console.log(req.body)
}

// TODO: Combine w/ sendTicketEmail?
export const sendTestEmail = async (req, res) => {
  const {
    testEmail, orders, content, showTitle, variantTitle, artistName,
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
  } = content

  try {
    const message = {
      to: testEmail,
      from: { email: 'no-reply@showstubs.com', name: 'SHOWstubs' },
      template_id: 'd-3027cf5726c041139347607731e6de9d',
      dynamic_template_data: {
        name: orders[0].name,
        order_number: orders[0].orderNumber,
        bundle_qty: orders[0].quantity,
        subject: `[TEST] Your SHOWstubs Ticket for ${showTitle}`,
        bundle_title: variantTitle,
        artist: artistName,
        show_title: showTitle,
        check_in: moment(check_in).format('h:mm a'),
        start_time: moment(start_time).format('h:mm a'),
        event_notes,
        pickup_items,
        shipping_items,
        shipping_date: moment(shipping_date).format('M/D/Y'),
        digital_items,
        digital_delivery_date: moment(digital_delivery_date).format('M/D/Y'),
      },
    }

    sgMail.send(message)

    logger.info('Test email sent')
    return res.status(200).json({ message: 'Test email sent' })
  } catch (err) {
    logger.debug({ error: err.message, sendGrid_error: err.response })
    return res.status(500).json({ error: err.message, sendGrid_error: err.response })
  }
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
    for (const order of orders) {
      const message = {
        to: order.email,
        from: { email: 'no-reply@showstubs.com', name: 'SHOWstubs' },
        template_id: 'd-3027cf5726c041139347607731e6de9d',
        dynamic_template_data: {
          name: order.name,
          order_number: order.orderNumber,
          bundle_qty: order.quantity,
          subject: `Your SHOWstubs Ticket for ${showTitle}`,
          bundle_title: variantTitle,
          artist: artistName,
          show_title: showTitle,
          check_in: moment(check_in).format('h:mm a'),
          start_time: moment(start_time).format('h:mm a'),
          event_notes,
          pickup_items,
          shipping_items,
          shipping_date: moment(shipping_date).format('M/D/Y'),
          digital_items,
          digital_delivery_date: moment(digital_delivery_date).format('M/D/Y'),
        },
      }

      sgMail.send(message)
    }

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

    logger.info('Emails sent')
    return res.status(200).json({ message: 'Emails sent' })
  } catch (err) {
    logger.debug({ error: err.message, sendGrid_error: err.response })
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
