var config = require('../../../config');

module.exports = {
    development: {
        username: config.postgres.su_username,
        password: config.postgres.su_password,
        database: config.postgres.database,
        host: config.postgres.options.host,
        port: config.postgres.options.port,
        dialect: config.postgres.options.dialect,
        databaseVersion: config.postgres.options.databaseVersion,
        dialectOptions: config.postgres.options.dialectOptions
    },
    test: {},
    local: {},
    production: {}
};

if (config.postgres.options.replication.write.host) {
    module.exports.development.host = config.postgres.options.replication.write.host;
    module.exports.development.port = config.postgres.options.replication.write.port;
}

module.exports.test = module.exports.development;
module.exports.local = module.exports.development;
module.exports.production = module.exports.development;
