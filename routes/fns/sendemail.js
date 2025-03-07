const { Resend } = require("resend");
const axios = require('axios');
const FormData = require('form-data');
const affAnalyticsModel = require("../../model/affiliates-analytics");


//SEND USING RESEND
const sendWithResend = async (recipient, subject, html) => {
    // Initialize Resend
    const resend = new Resend(process.env.RESEND_KEY);
    try {
        const data = await resend.emails.send({
            from: 'MIKEKA VIP <info@updates.mkekawaleo.com>',
            to: [recipient],
            reply_to: 'Admin <admin@mkekawaleo.com>',
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
const sendEmail = async (email, subject, html) => {
    try {
        let stats = await affAnalyticsModel.findOne({ pid: 'shemdoe' })
        if (stats?.email_count < 100) {
            //send mail
            sendWithResend(email, subject, html)
            //update count
            stats.email_count = stats.email_count + 1
            await stats.save()
        } else {
            sendMailErooMails(email, subject, html)
        }
    } catch (error) {
        console.log('Error sending email ' + error?.message)
    }
}


module.exports = sendEmail;