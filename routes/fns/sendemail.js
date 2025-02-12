const { Resend } = require("resend");

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_KEY);

const sendEmail = async (email, subject, html) => {
    try {
        const data = await resend.emails.send({
            from: 'MKEKAPLUS+ <info@updates.mkekawaleo.com>',
            to: [email],
            subject,
            html
        });
        return data;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}


module.exports = sendEmail;