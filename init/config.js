var path = require('path');

module.exports = function () {
    return require('maf/Service/Config')(path.resolve('/data/etc/mazaid/config.json'));
};
