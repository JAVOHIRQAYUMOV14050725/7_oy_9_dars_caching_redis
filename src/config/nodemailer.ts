import nodemailer from "nodemailer"

import dotenv from 'dotenv'
import { dot } from "node:test/reporters"
import SMTPTransport from "nodemailer/lib/smtp-transport"

dotenv.config()

export const createTransporter = () =>{

    let options:SMTPTransport.Options= {
        
            host:"smtp.gmail.com",
            port:587,
            secure:false,
            auth:{
                user:process.env.EMAIL_USER,
                pass:process.env.EMAIL_PASS
            },
    }

    const transporter = nodemailer.createTransport(options)
    return transporter
}
