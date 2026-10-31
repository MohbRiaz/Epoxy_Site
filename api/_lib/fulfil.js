/* One place that turns a confirmed order into: a Shiprocket order + a CRM lead.
   Shiprocket problems never block the customer — they're noted on the lead
   so you can create the shipment by hand. */
const { pushLead, orderLead } = require('./leads');
const shiprocket = require('./shiprocket');

async function fulfilOrder({ orderRef, totals, customer, payment, status, utm, extra = [] }) {
  const lead = orderLead({ orderRef, totals, customer, payment, status, utm });
  let ship = null;
  if (shiprocket.enabled()) {
    try {
      ship = await shiprocket.createOrder({ orderRef, totals, customer, payment });
      extra.push(`Shiprocket order: ${ship.order_id}, shipment: ${ship.shipment_id}`);
    } catch (e) {
      console.error('[shiprocket] create failed', e.message, e.data ? JSON.stringify(e.data).slice(0, 500) : '');
      extra.push(`⚠ Shiprocket order NOT created automatically (${e.message}). Create it by hand in Shiprocket.`);
    }
  }
  if (extra.length) lead.message += '\n' + extra.join('\n');
  await pushLead(lead);
  return { shiprocket: ship };
}

module.exports = { fulfilOrder };
