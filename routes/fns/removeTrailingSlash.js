const removeTrailingSlash = (options = {}) => {
    const redirectCode = options.redirectCode || 301;

    return (req, res, next) => {
        // Only apply to GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Only apply to paths longer than 1 character that end with a slash
        const hasTrailingSlash = req.path.length > 1 && req.path.endsWith('/');

        if (hasTrailingSlash) {
            const newPath = req.path.slice(0, -1); // remove the trailing slash
            const query = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
            return res.redirect(redirectCode, newPath + query);
        }

        next();
    };
};

module.exports = removeTrailingSlash;