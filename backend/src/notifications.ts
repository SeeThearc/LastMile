import EventEmitter from "events";
import prisma from "./prisma";

import nodemailer from "nodemailer";

export const orderEvents = new EventEmitter();

orderEvents.on("statusChanged", async (orderId: string, toStatus: string) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true }
    });

    if (!order) return;

    const email = order.customer.email;
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.log(`[EMAIL MOCK] To: ${email} | Subject: Order Status Update | Body: Your order ${order.id} is now ${toStatus}.`);
    } else {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: Number(SMTP_PORT) === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: EMAIL_FROM || `"LastMile Updates" <${SMTP_USER}>`,
        to: email,
        subject: `Your Order ${order.id} is now ${toStatus}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #0f766e;">Order Update</h2>
            <p>Hi ${order.customer.name},</p>
            <p>Your shipment (Tracking ID: <strong>${order.id}</strong>) has a new status update.</p>
            <p>Current Status: <strong style="padding: 4px 8px; background: #f1f5f9; border-radius: 4px;">${toStatus}</strong></p>
            <p>Thank you for using LastMile!</p>
          </div>
        `,
      });
      console.log(`[EMAIL SENT] To: ${email} -> ${toStatus}`);
    }

    const phone = order.customer.phone;
    if (phone) {
      const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;
      
      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
        console.log(`[SMS MOCK] To: ${phone} | Body: LastMile: Your order ${order.id} is now ${toStatus}.`);
      } else {
        const twilioClient = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
        await twilioClient.messages.create({
          body: `LastMile: Your shipment ${order.id} is now ${toStatus}.`,
          from: TWILIO_PHONE_NUMBER,
          to: phone
        });
        console.log(`[SMS SENT] To: ${phone} -> ${toStatus}`);
      }
    }

  } catch (error) {
    console.error(`[NOTIFICATION ERROR] Failed to send notifications for order ${orderId}:`, error);
  }
});
