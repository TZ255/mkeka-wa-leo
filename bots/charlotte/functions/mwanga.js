const { Bot } = require('grammy')
const { autoRetry } = require('@grammyjs/auto-retry')
const axios = require('axios').default
const cheerio = require('cheerio')
const https = require('https')
const mwangaModel = require('../database/mwanga')

const ADMIN_CHAT_ID = 741815228
const MWANGA_CHANNEL_ID = -1001239649906
const LATEST_LIMIT = 30

const bot = new Bot(process.env.CHARLOTTE_TOKEN)
bot.api.config.use(autoRetry())

const buildMwangaHeaders = (referer = 'https://djmwanga.com/') => {
    return {
        'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:151.0) Gecko/20100101 Firefox/151.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Connection': 'keep-alive',
        'Referer': referer,
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Priority': 'u=0, i',
        'TE': 'trailers'
    }
}

const mwangaAxios = axios.create({
    timeout: 20000,
    headers: buildMwangaHeaders(),
    httpsAgent: new https.Agent({ keepAlive: true }),
    maxRedirects: 5
})

const log = (...args) => {
    if (process.env.local === 'true') {
        console.log('[DJMwanga]', new Date().toISOString(), ...args)
    }
}

const normalizeUrl = (url, baseUrl = 'https://djmwanga.com/') => {
    if (!url) return ''
    return new URL(url, baseUrl).toString().split('#')[0].replace(/\/$/, '')
}

const parseSongMeta = (songTitle) => {
    let cleanTitle = songTitle.replace(/\s+/g, ' ').trim()
    let [, performerAndSong = cleanTitle] = cleanTitle.split(/\s+\|\s+/)
    performerAndSong = performerAndSong.replace(/\s+\|\s+Download$/i, '').trim()

    let [performer, ...songParts] = performerAndSong.split(/\s+[–-]\s+/)
    let title = songParts.join(' - ').trim()

    return {
        captionTitle: cleanTitle.replace(/\s+\|\s+Download$/i, ''),
        performer: performer?.trim() || undefined,
        title: title || undefined
    }
}

const getLatestPosts = ($, baseUrl = 'https://djmwanga.com/category/audio') => {
    let posts = []
    $('#latest-posts .music-card h6.card-title a[href], main h6.card-title a[href], main h6.latest-title a[href]').each((i, el) => {
        let title = $(el).text().replace(/\s+/g, ' ').trim()
        let url = normalizeUrl($(el).attr('href'), baseUrl)

        if (title && url && !posts.some(post => post.url === url)) {
            posts.push({ title, url })
        }
    })

    return posts.slice(0, LATEST_LIMIT)
}

const getAudioUrl = ($, baseUrl = 'https://djmwanga.com/') => {
    let downloadUrl = $('main article .entry-content a.btn-music-download[href]').attr('href')
    let audioUrl = downloadUrl || $('main article .entry-content audio source[type="audio/mpeg"]').attr('src') || $('main article .entry-content a[href*=".mp3"]').attr('href')

    return audioUrl ? normalizeUrl(audioUrl, baseUrl).replace(/\?_=\d+$/, '') : ''
}

const describeAxiosError = (error, fallbackMessage) => {
    if (!error.response) return error.message || fallbackMessage

    let status = error.response.status
    let url = error.config?.url || error.response.request?.res?.responseUrl || ''
    return `${fallbackMessage}: HTTP ${status}${url ? ` (${url})` : ''}`
}

const scrapASong = async (post) => {
    try {
        log('Fetching song page:', post.title, post.url)
        let song_data = await mwangaAxios.get(post.url, {
            headers: buildMwangaHeaders('https://djmwanga.com/category/audio')
        })
        log('Song page fetched:', post.url, `status=${song_data.status}`)

        let $ = cheerio.load(song_data.data)
        let the_song = getAudioUrl($, post.url)
        let song_title = $('main h1').text().replace(/\s+/g, ' ').trim() || post.title

        log('Song parsed:', {
            post_url: post.url,
            song_title,
            audio_url: the_song || 'NOT_FOUND'
        })

        if (!the_song) throw new Error(`No audio URL found for ${post.url}`)

        let { captionTitle, performer, title } = parseSongMeta(song_title)
        log('Sending audio to Telegram:', { captionTitle, performer, title })

        await bot.api.sendAudio(MWANGA_CHANNEL_ID, the_song, {
            parse_mode: 'HTML',
            caption: `<b>${captionTitle}</b>`,
            performer,
            title
        })

        log('Telegram audio sent:', song_title)
        return { song_title, audio_url: the_song }
    } catch (error) {
        let message = describeAxiosError(error, `Song scrape failed for ${post?.url || post?.title || 'unknown post'}`)
        log('Song scrape failed:', post?.title, post?.url, message)
        await bot.api.sendMessage(ADMIN_CHAT_ID, message)
        throw error
    }
}

const DJMwangaFn = async (durl = "https://djmwanga.com/category/audio") => {
    try {
        log('Started:', durl)

        let categoryResponse = await mwangaAxios.get(durl, {
            headers: buildMwangaHeaders('https://djmwanga.com/')
        })
        log('Category fetched:', durl, `status=${categoryResponse.status}`)

        let html = categoryResponse.data
        let $ = cheerio.load(html)
        let posts = getLatestPosts($, durl)

        log('Latest posts found:', posts.length)
        posts.forEach((post, i) => log(`Post ${i + 1}:`, post.title, post.url))

        for (let post of [...posts].reverse()) {
            log('Checking DB:', post.title, post.url)
            let existing = await mwangaModel.findOne({
                $or: [
                    { post_url: post.url },
                    { audio_title: post.title }
                ]
            })

            if (existing && existing.status !== 'failed') {
                log('Ignored already posted:', post.title, `status=${existing.status}`, `id=${existing._id}`)
                continue
            }

            log(existing ? 'Retrying failed post:' : 'New post found:', post.title)

            await bot.api.sendMessage(ADMIN_CHAT_ID, `Uploading ${post.title}`)
                .catch(e => log('Admin upload message failed:', e.message))

            try {
                let scraped = await scrapASong(post)
                let saved = await mwangaModel.findOneAndUpdate(
                    { post_url: post.url },
                    {
                        $set: {
                            audio_title: scraped.song_title,
                            post_url: post.url,
                            audio_url: scraped.audio_url,
                            status: 'posted'
                        }
                    },
                    { upsert: true, setDefaultsOnInsert: true, new: true }
                )
                log('DB saved as posted:', saved._id, scraped.song_title)
            } catch (error) {
                log('Saving failed status:', post.title, error.message)
                let failed = await mwangaModel.findOneAndUpdate(
                    { post_url: post.url },
                    {
                        $set: {
                            audio_title: post.title,
                            post_url: post.url,
                            status: 'failed',
                            last_error: error.message
                        }
                    },
                    { upsert: true, setDefaultsOnInsert: true, new: true }
                ).catch(e => log('Failed status save error:', e.message))

                if (failed) log('DB saved as failed:', failed._id, post.title)
            }
        }

        log('Finished:', durl)
    } catch (error) {
        log('Run failed:', durl, error.message)
    }
}

module.exports = {
    DJMwangaFn,
    getLatestPosts,
    getAudioUrl,
    parseSongMeta
}
