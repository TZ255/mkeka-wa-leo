const axios = require("axios");
const NodeCache = require("node-cache");
const ipAPILimitChecker = require("../../model/ip-api-limit");

// Create a cache instance with a TTL of 10 minutes (600 seconds)
const ipCache = new NodeCache({ stdTTL: 600 });

const getUserLocation = async (ip) => {
    try {
        // Check for cached data first.
        const cachedData = ipCache.get(ip);
        if (cachedData) {
            return cachedData;
        }

        // Get the API limit record from your DB.
        let limit = await ipAPILimitChecker.findOne({ primary_key: "shemdoe" });

        const now = Date.now();

        // If requests are not allowed and we haven't reached the reset time, return fail.
        if (!limit.allowed && now < limit.until) {
            return {
                status: "fail",
                message: "DB limit does not allow request",
            };
        }

        // If the block period has passed, reset the limit.
        if (!limit.allowed && now >= limit.until) {
            limit.allowed = true;
            await limit.save();
        }

        // Make the API request to ip-api.
        const response = await axios.get(`http://ip-api.com/json/${ip}`);

        if (!response.data) {
            return {
                status: "fail",
                message: "No data returned from ip-api",
            };
        }

        // Convert the header value to a number; default to 0 if not present.
        const remainingRequests = Number(response.headers?.["x-rl"] || 0);
        // If remaining requests are low (e.g., ≤5), set the rate limiter to block for 60 seconds.
        if (remainingRequests <= 5) {
            console.log(`ip-api.com limit reached -- ${remainingRequests}`)
            limit.allowed = false;
            limit.until = now + 60000; // Block for 60 seconds (60,000 milliseconds)
            await limit.save();
        }

        // Check for ip-api failure.
        if (response.data.status === "fail") {
            const { message, query } = response.data;
            return {
                status: "fail",
                message: `${message} on IP: ${query}`,
            };
        }

        // Extract the necessary fields.
        const { status, country, query, countryCode } = response.data;

        const locationData = {
            status,
            country,
            ip: query,
            c_code: countryCode,
            remaining_requests: remainingRequests,
        };

        // Cache the location data
        ipCache.set(ip, locationData);

        return locationData;
    } catch (error) {
        console.error("Error in getUserLocation:", error.message);
        return {
            status: "fail",
            message: `Request error: ${error.message}`,
        };
    }
};

module.exports = getUserLocation;