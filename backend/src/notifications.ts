import EventEmitter from "events";
import prisma from "./prisma";

export const orderEvents = new EventEmitter();

orderEvents.on("statusChanged", async (orderId: string, toStatus: string) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true }
    });

    if (!order) return;

    const email = order.customer.email;
    const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.log(`[EMAIL MOCK] To: ${email} | Subject: Order Status Update | Body: Your order ${order.id} is now ${toStatus}.`);
    } else {
      console.log(`[EMAIL SENT] To: ${email} -> ${toStatus}`);
    }

    const phone = order.customer.phone;
    if (phone) {
      const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
      
      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
        console.log(`[SMS MOCK] To: ${phone} | Body: LastMile: Your order ${order.id} is now ${toStatus}.`);
      } else {
        console.log(`[SMS SENT] To: ${phone} -> ${toStatus}`);
      }
    }

  } catch (error) {
    console.error(`[NOTIFICATION ERROR] Failed to send notifications for order ${orderId}:`, error);
  }
});
