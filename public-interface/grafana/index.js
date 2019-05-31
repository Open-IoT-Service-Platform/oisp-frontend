var reverseProxyGrafana = require('./reverse-proxy-grafana.js'),
    reverseProxyDataSource = require('./reverse-proxy-opentsdb'),
    getViewerToken = require('./viewer-token.js');

module.exports = {
    reverseProxyGrafana: reverseProxyGrafana,
    reverseProxyDataSource: reverseProxyDataSource,
    getViewerToken: getViewerToken
};
