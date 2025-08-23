const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { marked } = require("marked");

async function parseMarkdown(filePath) {
    // Read file asynchronously
    const raw = await fs.promises.readFile(filePath, "utf8");

    // Extract frontmatter + markdown content
    const { data: meta, content } = matter(raw);

    // Table of Contents array
    const toc = [];

    // Create renderer for marked ≥5
    const renderer = {
        heading({ tokens, depth }) {
            // Convert inline tokens to string
            const text = this.parser.parseInline(tokens);

            // Generate slug safely
            const slug = text
                .toLowerCase()
                .replace(/[^\w]+/g, "-")
                .replace(/^-+|-+$/g, "");

            // Add to TOC for H1–H3
            if (depth <= 3) toc.push({ text, level: depth, slug });

            return `<h${depth} id="${slug}">${text}</h${depth}>`;
        }
    };

    // Use the custom renderer
    marked.use({ renderer });

    // Convert markdown to HTML
    const html = marked.parse(content);

    return { meta, html, toc };
}


// Function to load all posts
// Returns array of post metadata { meta + slug }
async function loadPostsMeta() {
  const postsFolder = path.join(__dirname, "../../blog/posts");
  const files = await fs.promises.readdir(postsFolder);

  const posts = await Promise.all(
    files
      .filter(f => f.endsWith(".md"))
      .map(async (file) => {
        const raw = await fs.promises.readFile(path.join(postsFolder, file), "utf8");
        const { data } = matter(raw);
        return {
          ...data,
          slug: file.replace(/\.md$/, "")
        };
      })
  );

  //sort by datePublished descending
  posts.sort((a, b) => new Date(b.date_modified) - new Date(a.date_modified));

  return posts;
}

module.exports = { parseMarkdown, loadPostsMeta };