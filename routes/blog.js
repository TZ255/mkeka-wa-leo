const router = require('express').Router();
const path = require('path');
const fs = require('fs');

const { parseMarkdown, loadPostsMeta } = require('./fns/mdParser');

router.get('/blog', async (req, res) => {
    try {
        const posts = await loadPostsMeta();
        res.render("4-blog/index", { posts });
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
        res.render("4-blog/post", { meta, body: html, toc });
    } catch (err) {
        console.error(err.message, err);
        res.status(500).send("Server error");
    }
});

module.exports = router;