const config = require('../config');
const { exec } = require('child_process');

var UpdateDB = function(){};
var cdCommand = "cd /app/iot-entities/postgresql/migrations;";


UpdateDB.prototype.update = function(test) {
    var database = config.postgres.database;
    if (test === "test") {
        database = "test";
    }

    var dbupdateCommand = "npx sequelize-cli db:migrate --config sequelizeCliConfig.js";
    console.log("Executing " + cdCommand + dbupdateCommand);
    exec(cdCommand + dbupdateCommand, (err, stdout, stderr) => {
        if (err) {
            console.log("Error: ", err);
            process.exit(1);
        }
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
        process.exit(0);
    });
};

UpdateDB.prototype.revertOne = function(test) {
    var database = config.postgres.database;
    if (test === "test") {
        database = "test";
    }

    var dbupdateCommand = "npx sequelize-cli db:migrate:undo --url postgres://" +
        config.postgres.su_username +
        ":" + config.postgres.su_password +
        "@" + config.postgres.options.replication.write.host +
        "/" + database;
    console.log("Executing " + cdCommand + dbupdateCommand);
    exec(cdCommand + dbupdateCommand, (err, stdout, stderr) => {
        if (err) {
            console.log("Error: ", err);
            process.exit(1);
        }
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
        process.exit(0);
    });
};

UpdateDB.prototype.revertAll = function(test) {
    var database = config.postgres.database;
    if (test === "test") {
        database = "test";
    }

    var dbupdateCommand = "npx sequelize-cli db:migrate:undo:all --url postgres://" +
        config.postgres.su_username +
        ":" + config.postgres.su_password +
        "@" + config.postgres.options.replication.write.host +
        "/" + database;
    console.log("Executing " + cdCommand + dbupdateCommand);
    exec(cdCommand + dbupdateCommand, (err, stdout, stderr) => {
        if (err) {
            console.log("Error: ", err);
            process.exit(1);
        }
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
        process.exit(0);
    });
};

module.exports = UpdateDB;
