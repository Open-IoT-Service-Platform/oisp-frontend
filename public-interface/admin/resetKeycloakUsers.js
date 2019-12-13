const keycloak = require('../lib/security/keycloak');

module.exports = function() {
    var promises = [];
    keycloak.serviceAccount.getUsers().then(users => {
        users.forEach(user => {
            promises.push(keycloak.serviceAccount.deleteUser(user.id));
        });
        return Promise.all(promises);
    }).then(() => {
        console.log('All users in keycloak are deleted successfully');
        process.exit(0);
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });
};
