const nodeMailer = require("nodemailer");
const bcrypt = require("bcryptjs");



const sendOtpByEmail = async (email, otp) => {

    try {
        // console.log("1");
        const transporter = nodeMailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Verify your account..!",
            text: `your OTP is ${otp}`,
            html: `<b> your OTP is ${otp}</b>`

        }
        //    console.log("2")
        const info = await transporter.sendMail(mailOptions);
        // console.log("3")
        if (info) {
            console.log("Otp send by email successfully", info.messageId);
        }
        else {
            console.log("Otp sending by email error");
        }
        return info;

    } catch (error) {
        console.log("Error sending Otp:", error.message);
    }

}


// hashing password
const securePassword = async (password) => {
    try {
        const hashPassword = await bcrypt.hash(password, 10);
        return hashPassword
    } catch (error) {
        console.log("Password hashing error:", error.message);
    }
}


const resendOtpSendByEmail = async (email, newOtp) => {
    try {
        const transporter = nodeMailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD

            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Resend OTP..!",
            text: `your new OTP is ${newOtp}`,
            html: `<b> your new OTP is ${newOtp}</b>`
        }
        let info = await transporter.sendMail(mailOptions);

        if (info) {
            console.log("OTP resend successfully", info.messageId);
        }
        else {
            console.log("OTP rensend failed");
        }
        return info;

    } catch (error) {
        console.log("internal error of OTP sending", error.message);
    }
}


const generateString = () => {
    const char = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < 10; i++) {
        const randomIndex = Math.floor(Math.random() * char.length);
        result += char.charAt(randomIndex);
    }
    return result;
}



module.exports = {
    sendOtpByEmail,
    securePassword,
    resendOtpSendByEmail,
    generateString
}
