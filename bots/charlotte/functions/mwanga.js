const axios = require('axios').default
const cheerio = require('cheerio')
const mwangaModel = require('../database/mwanga')

const scrapASong = async (song, bot) => {
    try {
        let song_data = await axios.get(song)
        let $ = cheerio.load(song_data.data)
        let the_song = $('#primary .primary-content article .entry-content a').attr('href')
        let song_title = $('#primary header h1').text()
        let [audio, performer_and_song, downd] = song_title.split(' | ')
        let [performer, wimbo] = performer_and_song.split(' - ')
        //upload wimbo
        let mwanga_channel = -1001239649906
        await bot.api.sendAudio(mwanga_channel, the_song, {
            parse_mode: 'HTML',
            caption: `<b>${song_title.replace(' | Download', '')}</b>`,
            performer, title: wimbo
        })
    } catch (error) {
        console.log(error.message)
        await bot.api.sendMessage(741815228, error?.message)
    }
}

const DJMwangaFn = async (bot, durl) => {
    try {
        let html = (await axios.get(durl)).data
        let $ = cheerio.load(html)
        let articles = $('#primary .primary-content .news-list-wrap article')

        articles.each((i, el) => {
            let song_title = $(el).find('div h2 a').text().trim()
            let song_link = $(el).find('div h2 a').attr('href')

            //check last 5 and find if already uploaded
            if (i < 5) {
                mwangaModel.findOne({ audio_title: song_title })
                    .then((d) => {
                        if (d) {
                            //already available
                            console.log('Already Available')
                        } else {
                            //scrap
                            mwangaModel.create({ audio_title: song_title })
                                .catch(e => console.log(e.message))
                            bot.api.sendMessage(741815228, `Uploading ${song_title}`)
                                .catch(e => console.log(e.message))
                            scrapASong(song_link, bot)
                                .catch(e => console.log(e.message))
                        }
                    }).catch(e => console.log(e.message))
            }
        })
    } catch (error) {
        console.log(error.message)
    }
}

module.exports = {
    DJMwangaFn
}