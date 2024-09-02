import { Request, Response } from "express";
import dotenv from "dotenv";
import { mailer } from "../utils/mailer";
import { verificationHtml } from "../utils/mail.welcome.msg";
import { COMPANY_NAME } from "../utils/constants";

type verificationProps = {
    [key: string]: {
        code: string,
        timer: NodeJS.Timeout
    }
}

let sentVerifications: verificationProps = {};

// function to send verification email
export const sendVerificationEmail = async (req: Request, res: Response) => {
    try {
        dotenv.config();

        const { email } = req.body;
        if (!email) {
            return res.status(400).send("Email is required");
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // generate a random 6 digit code

        // mailer.sendMail({
        //     from: COMPANY_NAME,
        //     to: email,
        //     subject: "Verify Email",
        //     html: verificationHtml(email, verificationCode)
        // });
        // mailer.on("error", (error) => {
        //     throw new Error(error.message);
        // });

        // store the verification code and set a timer to delete it after 5 minutes
        const timer = setTimeout(() => {
            delete sentVerifications[email];
        }, 5 * 60 * 1000);
        sentVerifications[email] = { code: verificationCode, timer };

        return res.status(200).json(`Email sent successfully to ${email} with verification code`);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

// function to verify email
export const verifyEmail = async (req: Request, res: Response) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            throw new Error("email or code not provided");
        }
        const storedCode = sentVerifications[email]; // get the stored code
        console.info(storedCode);

        if (!storedCode) {
            throw new Error("Verification code not found or expired");
        }
        if (storedCode.code !== code) {
            throw new Error("Invallid verification code");
        }

        // clear the timer and delete the stored code
        clearTimeout(storedCode.timer);
        delete sentVerifications[email];

        res.status(200).json({ message: "Email Verified" });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}