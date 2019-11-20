var users = require('../engine/api/v1/users');

var authorization,
    secConfig,
    generateToken,
    tokenTypes;

try {
    authorization = require('../lib/security/authorization');
    secConfig = require('../lib/security/config');
    authorization.middleware(secConfig);
    generateToken = authorization.generateToken;
    tokenTypes = authorization.tokenTypes;
} catch(err) {
    console.log("An error has occurred by getUserToken tool.");
}

module.exports = function() {
    if (arguments.length < 2) {
        console.error("Not enough arguments : ", arguments);
        console.log("Usage: node admin getUserToken [email] [expires after in minutes]");
        process.exit(1);
    }
    if (!authorization || !secConfig || !generateToken || !tokenTypes) {
        console.log("Authorization module has failed to initialize, exiting...");
        process.exit(1);
    }
    var email = arguments[0],
        expiresAfterInMinutes = arguments[1],
        expire = expiresAfterInMinutes * 60 * 1000;
    users.searchUser(email, function(err, user) {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        generateToken(user.id, user.accounts, user.type, expire, tokenTypes.user,
            function(err, token) {
                if (err) {
                    console.error(err);
                    process.exit(1);
                }
                console.log("\nToken will be valid " + expiresAfterInMinutes +
                    " minutes for the user: " + email + "\n");
                console.log("---------------- BEGIN TOKEN ----------------");
                console.log(token);
                console.log("----------------- END TOKEN -----------------");
                process.exit(0);
            }
        );
    });
};
