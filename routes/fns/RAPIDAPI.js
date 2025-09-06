const RapidKeysModel = require("../../model/rapid_keys");

// function to get a random rapid API key with less times used

const getLessUsedAPIKey = async () => {
    try {
        const key_dock = await RapidKeysModel.findOne().sort({ times_used: 1 });
        if(!key_dock) throw new Error("No API keys available");

        const key = key_dock.key;
        // increment the times used
        await RapidKeysModel.findByIdAndUpdate(key_dock._id, { $inc: { times_used: 1 } });
        return key;
    } catch (error) {
        console.error("Error fetching random rapid API key:", error);
        throw error;
    }
};

module.exports = {
    getLessUsedAPIKey
}