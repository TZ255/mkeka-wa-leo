const { Resend } = require("resend");
const axios = require('axios');
const FormData = require('form-data');


//SEND USING RESEND
const sendWithResend = async (email, subject, html) => {
    // Initialize Resend
    const resend = new Resend(process.env.RESEND_KEY);
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
    }
}


// SEND USING MAILEROO
const sendMailErooMails = async (recipient, subject, html) => {
    try {
        const url = 'https://smtp.maileroo.com/send';

        let data = new FormData();

        data.append('from', 'MIKEKA VIP <info@vip.mkekawaleo.com>');
        data.append('to', `<${recipient}>`);
        data.append('reply_to', '<admin@mkekawaleo.com>')
        data.append('subject', subject);
        data.append('html', html);

        const config = {
            method: 'post',
            url: url,
            headers: {
                'X-API-Key': process.env.MAILEROO_KEY1,
                ...data.getHeaders()
            },
            data: data
        };

        axios(config)
            .then(function (response) {
                console.log(JSON.stringify(response.data));
            })
            .catch(function (error) {
                console.log(error?.message);
            });
    } catch (error) {
        console.log(error?.message)
    }
}

//SENDING EMAIL BY ROTATING MAILEROO AND RESEND
const sendEmail = (email, subject, html) => {
    let minutes = new Date().getMinutes()
    if (minutes % 2 === 0) {
        sendMailErooMails(email, subject, html)
    } else {
        sendMailErooMails(email, subject, html)
    }
}


module.exports = sendEmail;