import nodemailer, { TransportOptions } from 'nodemailer';
import dotenv from "dotenv";

dotenv.config();

// Transporter
export const mailer = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
})
