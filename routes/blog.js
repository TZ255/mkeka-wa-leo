const router = require('express').Router();
const path = require('path');
const fs = require('fs');

const { parseMarkdown, loadPostsMeta } = require('./fns/mdParser');
const { pageLocals, assetUrl } = require('./fns/seo');

router.get('/blog', async (req, res) => {
    try {
        const posts = await loadPostsMeta();
        res.render("4-blog/index", pageLocals({
            page: { id: "blog-index", section: "blog", title: "Blog | Mkeka wa Leo", canonicalPath: "/blog" },
            seo: {
                title: "Blog | Mkeka wa Leo",
                description: "Makala za mikeka za betting Tanzania. Soma makala zetu za mikeka na ujifunze namna nzuri ya kubeti, ufahamu kuhusu soko la betting Tanzania na namna ya kuwa mshindi wa mara kwa mara",
                keywords: "mikeka za betting, makala za betting, jinsi ya kushinda betting, betting tips Tanzania",
            },
            data: { posts }
        }));
    } catch (err) {
        console.error(err.message, err);
        res.status(500).send("Server error");
    }
});

router.get("/blog/:slug", async (req, res) => {
    try {
        const slug = req.params.slug.toLocaleLowerCase();
        const filePath = path.join(__dirname, "..", "blog/posts", `${slug}.md`);
        if (!fs.existsSync(filePath)) {
            return res.status(404).send("Post not found");
        }
        const { meta, html, toc } = await parseMarkdown(filePath);
        res.render("4-blog/post", pageLocals({
            page: { id: "blog-post", section: "blog", title: meta.title, canonicalPath: "/blog/" + meta.slug },
            seo: { ...meta, canonicalPath: "/blog/" + meta.slug, type: "article", image: meta.coverImage || assetUrl("/imgs/blog/makala-default.webp"), includeSiteSchema: false },
            data: { meta, body: html, toc }
        }));
    } catch (err) {
        console.error(err.message, err);
        res.status(500).send("Server error");
    }
});


//list of tanzania bookies
router.get('/tanzania/bookies', (req, res) => {
    const partials = {
        canonicalPath: '/tanzania/bookies',
        year: new Date().getFullYear()
    }

    res.render('4-bookies/index', pageLocals({
        page: { id: 'bookies-index', section: 'bookies', title: 'Orodha ya Kampuni za Betting Tanzania ' + partials.year, canonicalPath: partials.canonicalPath },
        seo: {
            title: 'Orodha ya Kampuni za Betting Tanzania ' + partials.year + ' - Kampuni Zenye Usajili Tanzania',
            description: 'Angalia orodha ya kampuni za betting Tanzania ' + partials.year + ' zilizosajiliwa. Pata maelezo ya kina, promo codes na ofa kwa kampuni hizi, Gal Sport Betting, Betway, Leonbet, 888Bet, Betwinner, Premierbet, Parimatch, Meridianbet, Betpawa n.k',
            canonicalPath: partials.canonicalPath,
        },
        data: { partials }
    }))
})

//tanzania bookies
router.get('/tanzania/bookies/:bookie', async (req, res) => {
    try {
        const slug = req.params.bookie.toLocaleLowerCase();
        const filePath = path.join(__dirname, "..", "blog/bookies", `${slug}.md`);
        if (!fs.existsSync(filePath)) {
            return res.status(404).send("Post not found");
        }
        const { meta, html, toc } = await parseMarkdown(filePath);

        res.render("4-bookies/post", pageLocals({
            page: { id: "bookie-post", section: "bookies", title: meta.title, canonicalPath: "/tanzania/bookies/" + meta.slug },
            seo: { ...meta, canonicalPath: "/tanzania/bookies/" + meta.slug, type: "article", image: meta.coverImage, includeSiteSchema: false },
            data: { meta, body: html, toc }
        }));
    } catch (err) {
        console.error(err.message, err);
        res.status(500).send("Server error");
    }
})

//us pages
router.get(['/contact-us', '/privacy-policy', '/app-privacy', '/delete-account', '/cookie-policy', '/about-us', '/terms-of-use'], async (req, res) => {
    try {
        const slugMap = {
            '/terms-of-use': '/terms'
        };
        const slug = slugMap[req.path] || req.path;
        const filePath = path.join(__dirname, "..", "blog/us", `${slug}.md`);
        if (!fs.existsSync(filePath)) {
            return res.status(404).send("Post not found");
        }
        const { meta, html, toc } = await parseMarkdown(filePath);
        const canonicalPath = String(meta.url || req.path).replace('https://mkekawaleo.com', '');

        res.render("us/index", pageLocals({
            page: { id: "policy-page", section: "company", title: meta.title, canonicalPath },
            seo: { title: meta.title, description: meta.description, canonicalPath, author: meta.author, dateModified: meta.date_modified },
            data: { meta, body: html, toc }
        }));
    } catch (err) {
        console.error(err.message, err);
        res.status(500).send("Server error");
    }
})


module.exports = router;
