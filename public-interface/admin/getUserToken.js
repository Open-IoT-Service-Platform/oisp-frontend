const authorization = require('../lib/security/authorization'),
    secConfig = require('../lib/security/config');

authorization.middleware(secConfig);

const generateToken = authorization.generateToken;

module.exports = function() {
    if (arguments.length < 2) {
        console.error("Not enough arguments : ", arguments);
        console.log("Usage: node admin getUserToken [email] [expires after in minutes]");
        process.exit(1);
    }
    if (!authorization || !secConfig || !generateToken) {
        console.log("Authorization module has failed to initialize, exiting...");
        process.exit(1);
    }
    var email = arguments[0],
        expiresAfterInMinutes = arguments[1],
        expire = expiresAfterInMinutes * 60;
    generateToken(null, null, null, null,
        function(err, token) {
            if (err) {
                console.error(err);
                process.exit(1);
            }
            console.log("\nToken will be valid " + expiresAfterInMinutes +
                " minutes for the user: " + email + "\n");
            console.log("---------------- BEGIN ----------------");
            console.log(token);
            console.log("----------------- END -----------------");
            process.exit(0);
        }, email, expire);
};
