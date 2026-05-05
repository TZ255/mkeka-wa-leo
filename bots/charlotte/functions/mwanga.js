const { Bot } = require('grammy')
const { autoRetry } = require('@grammyjs/auto-retry')
const axios = require('axios').default
const cheerio = require('cheerio')
const mwangaModel = require('../database/mwanga')

const ADMIN_CHAT_ID = 741815228
const MWANGA_CHANNEL_ID = -1001239649906
const LATEST_LIMIT = 5
const AUDIO_CATEGORY_URL = 'https://djmwanga.com/category/audio'

const bot = new Bot(process.env.CHARLOTTE_TOKEN)
bot.api.config.use(autoRetry())

const normalizeUrl = (url) => {
    if (!url) return ''
    return url.split('#')[0].replace(/\/$/, '')
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

const getLatestPosts = ($) => {
    let posts = []
    $('#latest-posts .music-card h6.card-title a[href], main h6.card-title a[href], main h6.latest-title a[href]').each((i, el) => {
        let title = $(el).text().replace(/\s+/g, ' ').trim()
        let url = normalizeUrl($(el).attr('href'))

        if (title && url && !posts.some(post => post.url === url)) {
            posts.push({ title, url })
        }
    })

    return posts.slice(0, LATEST_LIMIT)
}

const getAudioUrl = ($) => {
    let downloadUrl = $('main article .entry-content a.btn-music-download[href]').attr('href')
    let audioUrl = downloadUrl || $('main article .entry-content audio source[type="audio/mpeg"]').attr('src') || $('main article .entry-content a[href$=".mp3"]').attr('href')

    return audioUrl ? audioUrl.replace(/\?_=\d+$/, '') : ''
}

const scrapASong = async (post) => {
    try {
        let song_data = await axios.get(post.url)
        let $ = cheerio.load(song_data.data)
        let the_song = getAudioUrl($)
        let song_title = $('main h1').text().replace(/\s+/g, ' ').trim() || post.title

        if (!the_song) throw new Error(`No audio URL found for ${post.url}`)

        let { captionTitle, performer, title } = parseSongMeta(song_title)
        await bot.api.sendAudio(MWANGA_CHANNEL_ID, the_song, {
            parse_mode: 'HTML',
            caption: `<b>${captionTitle}</b>`,
            performer,
            title
        })

        return { song_title, audio_url: the_song }
    } catch (error) {
        console.log(error.message)
        await bot.api.sendMessage(ADMIN_CHAT_ID, error?.message)
        throw error
    }
}

const DJMwangaFn = async (durl = AUDIO_CATEGORY_URL) => {
    try {
        let html = (await axios.get(durl)).data
        let $ = cheerio.load(html)
        let posts = getLatestPosts($)

        for (let post of posts) {
            let existing = await mwangaModel.findOne({
                $or: [
                    { post_url: post.url },
                    { audio_title: post.title }
                ]
            })

            if (existing && existing.status !== 'failed') {
                console.log(`Already Available: ${post.title}`)
                continue
            }

            await bot.api.sendMessage(ADMIN_CHAT_ID, `Uploading ${post.title}`)
                .catch(e => console.log(e.message))

            try {
                let scraped = await scrapASong(post)
                await mwangaModel.findOneAndUpdate(
                    { post_url: post.url },
                    {
                        $set: {
                            audio_title: scraped.song_title,
                            post_url: post.url,
                            audio_url: scraped.audio_url,
                            status: 'posted'
                        }
                    },
                    { upsert: true, setDefaultsOnInsert: true }
                )
            } catch (error) {
                await mwangaModel.findOneAndUpdate(
                    { post_url: post.url },
                    {
                        $set: {
                            audio_title: post.title,
                            post_url: post.url,
                            status: 'failed',
                            last_error: error.message
                        }
                    },
                    { upsert: true, setDefaultsOnInsert: true }
                ).catch(e => console.log(e.message))
            }
        }
    } catch (error) {
        console.log(error.message)
    }
}

module.exports = {
    DJMwangaFn,
    AUDIO_CATEGORY_URL,
    getLatestPosts,
    getAudioUrl,
    parseSongMeta
}
