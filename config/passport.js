const mkekaUsersModel = require('../model/mkeka-users');

module.exports = function (passport) {
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await mkekaUsersModel.findById(id, { password: 0 });
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });
};
