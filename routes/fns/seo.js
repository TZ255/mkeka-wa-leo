const SITE_URL = 'https://mkekawaleo.com';
const SITE_NAME = 'Mkeka wa Leo';
const DEFAULT_IMAGE = `${SITE_URL}/imgs/logos/og.webp`;
const DEFAULT_DESCRIPTION = 'Betting tips za mpira wa miguu Tanzania, mikeka ya leo, matokeo, ratiba, misimamo na uchambuzi wa michezo.';

const absoluteUrl = (value = '/') => {
    if (!value) return SITE_URL;
    if (/^https?:\/\//i.test(value)) return value;
    return `${SITE_URL}${String(value).startsWith('/') ? value : `/${value}`}`;
};

const assetUrl = (value) => absoluteUrl(value);

const buildSeo = ({
    title = SITE_NAME,
    description = DEFAULT_DESCRIPTION,
    canonicalPath,
    keywords = '',
    image = DEFAULT_IMAGE,
    imageAlt,
    type = 'website',
    robots = 'index, follow',
    author,
    datePublished,
    dateModified,
    twitterTitle,
    includeSiteSchema = true,
} = {}) => ({
    title,
    description,
    canonicalPath,
    keywords,
    image: absoluteUrl(image),
    imageAlt,
    type,
    robots,
    author,
    datePublished,
    dateModified,
    twitterTitle,
    includeSiteSchema,
});

const buildPage = ({
    id,
    section,
    title,
    heading,
    canonicalPath,
    language = 'sw-TZ',
    updatedAt,
} = {}) => ({
    id,
    section,
    title,
    heading: heading || title,
    canonicalPath,
    language,
    updatedAt,
});

const pageLocals = ({ page = {}, seo = {}, data = {} } = {}) => {
    const normalizedPage = buildPage(page);
    const normalizedSeo = buildSeo({
        canonicalPath: normalizedPage.canonicalPath,
        title: normalizedPage.title,
        ...seo,
    });

    return {
        page: normalizedPage,
        seo: normalizedSeo,
        ...data,
    };
};

module.exports = {
    SITE_URL,
    SITE_NAME,
    DEFAULT_IMAGE,
    DEFAULT_DESCRIPTION,
    absoluteUrl,
    assetUrl,
    buildSeo,
    buildPage,
    pageLocals,
};
