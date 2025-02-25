const axios = require('axios');
const FormData = require('form-data');

const sendMailErooMails = async (recipient, subject, html) => {
    try {
        const url = 'https://smtp.maileroo.com/send';

        let data = new FormData();

        data.append('from', 'MKEKAPLUS+ <info@updates2.mkekawaleo.com>');
        data.append('to', `George ${recipient}`);
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
                console.log(error);
            });
    } catch (error) {
        console.log(error?.message)
    }
}

module.exports = sendMailErooMails