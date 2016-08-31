var path = require('path');

var Di = require('maf/Di');
var RequestDebug = require('maf/Request/Debug');

module.exports = (logger, config, originalDi) => {

    return new Promise((resolve, reject) => {

        var di = new Di();

        di.config = config;

        di.logger = logger;

        di.api = {};

        var originalDb;

        if (originalDi) {
            di.debug = new RequestDebug();
            originalDb = originalDi.db;
        }

        require(path.join(__dirname, 'db'))(config, di, originalDb)
            .then(() => {
                return require('mazaid-rest-exec-tasks/init/di')(logger, config, originalDi);
            })
            .then((execTasksDi) => {
                for (var apiName in execTasksDi.api) {
                    if (apiName === 'rest' && 'rest' in di.api) {
                        continue;
                    }

                    di.api[apiName] = execTasksDi.api[apiName];
                }

                return require('mazaid-rest-check-tasks/init/di')(logger, config, originalDi);
            })
            .then((checkTasksDi) => {
                for (var apiName in checkTasksDi.api) {
                    if (apiName === 'rest' && 'rest' in di.api) {
                        continue;
                    }

                    di.api[apiName] = checkTasksDi.api[apiName];
                }
                return require('mazaid-rest-checks/init/di')(logger, config, originalDi);
            })
            .then((checksDi) => {

                for (var apiName in checksDi.api) {
                    if (apiName === 'rest' && 'rest' in di.api) {
                        continue;
                    }

                    di.api[apiName] = checksDi.api[apiName];
                }

            })
            .then(() => {
                resolve(di);
            })
            .catch((error) => {
                reject(error);
            });

    });

};
