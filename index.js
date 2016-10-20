var path = require('path');
var express = require('maf/vendors/express');
var logger = require('maf/Service/Logger')('mazaid');

var nprof = require('nprof');

process.on('unhandledRejection', (error) => {
    logger.fatal(error);
});

require(path.join(__dirname, '/init/config'))()
    .then((config) => {
        return require('./init/di')(logger, config);
    })
    .then((di) => {

        var appConfig = {
            bodyParser: {
                urlencoded: true
            }
        };

        var app = require('maf/Service/Application')(di, appConfig);

        app.use('/', express.static(__dirname + '/node_modules/mazaid-web/public'));

        app.get('/feConfig', function (req, res) {
            res.json(di.config.feConfig);
        });

        app.post('/_profile/cpu', function (req, res) {
            nprof.cpuProfile(di.config.nprof.snapshotPath, 5000)
                .then((info) => {
                    res.json({result: info});
                })
                .catch((error) => {
                    logger.error(error);
                    res.status(500).json({error: error.message});
                });
        });

        app.post('/_profile/memory', function (req, res) {
            nprof.takeMemorySnapshot(di.config.nprof.snapshotPath)
                .then((info) => {
                    res.json({result: info});
                })
                .catch((error) => {
                    logger.error(error);
                    res.status(500).json({error: error.message});
                });
        });

        // if _debug
        app.use((req, res, next) => {

            res._startTime = new Date().getTime();

            if (req._debug === true) {

                require(path.join(__dirname, '/init/di'))(logger, di.config, di)
                    .then((di) => {
                        req.di = di;
                        next();
                    })
                    .catch((error) => {
                        logger.error(error);
                        res.serverError();
                        next();
                    });

                return;

            } else {
                req.di = di;
                next();
            }
        });

        return require(path.join(__dirname, '/init/rest'))(logger, app, di);

    })
    .then((app) => {

        var config = app.di.config;

        app.listen(config.port, config.host, function() {
            logger.info(`listen on ${config.host}:${config.port}`);
        });

    })
    .catch((error) => {
        logger.fatal(error);
        throw error;
    });
