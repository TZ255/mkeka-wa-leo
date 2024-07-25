const qs = require('qs')
const axios = require('axios').default
const cheerio = require('cheerio')

const deleteMessage = async (ctx, msgid) => {
    try {
        await ctx.api.deleteMessage(ctx.chat.id, msgid)
    } catch (error) {
        console.log(error.message)
    }
}

const reqEpisodeAxios = async (Origin, referer, formData) => {
    const response = await axios.post(referer, qs.stringify(formData), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,image/svg+xml,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Origin': Origin,
            'Connection': 'keep-alive',
            'Referer': referer,
            'Cookie': 'affiliate=TTTu2kT2yL1E6ULf0GXE2X0lrVgMXMnLVo2PF9IcW8D%2B0JYa9CoJrekdktMXc1Pxx5QN5Rhs5nSyQl0dIG2Xy9O15w5F8%2F7E2dwag%3D%3D; lang=english',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Save-Data': 'on',
            'Priority': 'u=0, i'
        },
        //if axios failed recognize ssl cert ignore
        httpsAgent: new (require('https').Agent)({
            rejectUnauthorized: false
        }),
        maxRedirects: 0,  // This will prevent axios from following redirects
        validateStatus: function (status) {
            return status >= 200 && status < 400;  // Resolve only if the status code is less than 400
        }
    });
    return response.headers.location
}


const nkiriFunction = async (ctx, drama_url, idadi) => {
    try {
        //get all nkiri urls
        let htmls = (await axios.get(drama_url)).data
        let $ = cheerio.load(htmls)
        let lnks = $('.elementor-button-wrapper a')
        let length = lnks.length

        lnks.each((i, el) => {
            if (i >= length - idadi) {
                let url = $(el).attr('href')
                let id = url.split('.com/')[1].split('/')[0].trim()
                let Origin = url.split('.com/')[0] + '.com'

                const formData = {
                    op: 'download2',
                    id,
                    rand: '',
                    referer: '',
                    method_free: '',
                    method_premium: ''
                };

                reqEpisodeAxios(Origin, url, formData).then((res) => {
                    let drama = url.split('/').pop() //remove last item and return it
                    drama = drama.replace('.(NKIRI.COM)', 'SHEMDOE').replace('_(NKIRI.COM)', 'SHEMDOE').split('SHEMDOE')[0]
                    let epno = drama.split('.').pop()
                    drama = drama.replace(`.${epno}`, '')
                    let n2 = `${epno}.${drama}`.substring(0, 30)
                    let txt = `[dramastore.net] ${n2}.540p.NK.mkv | ${res}\n`
                    ctx.reply(txt).then((t) => {
                        setTimeout(() => {
                            deleteMessage(ctx, t.message_id)
                        }, 15000 * idadi)
                    })
                })
                    .catch(e => {
                        console.log(e.message, e)
                        ctx.reply(e.message)
                    })
            }
        })
    } catch (error) {
        console.log(error.message)
    }
}

module.exports = {
    nkiriFunction, deleteMessage
}