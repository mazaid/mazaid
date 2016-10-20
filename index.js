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

        app.set('json spaces', 4);

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

        app.post('/_profile/cpu/start', function (req, res) {

            logger.info('[POST /_profile/cpu/start] starting cpu profile');

            nprof.startCpuProfile();
            res.json({result: 'started'});
        });

        app.post('/_profile/cpu/stop', function (req, res) {

            logger.info('[POST /_profile/cpu/stop] stopping cpu profile');

            var profile = nprof.stopCpuProfile();

            nprof.saveCpuProfile(profile, di.config.nprof.snapshotPath)
                .then((info) => {
                    logger.info('[POST /_profile/cpu/stop] profile saved to ' + info.filepath);
                    res.json({result: info});
                })
                .catch((error) => {
                    logger.error(error);
                    res.status(500).json({error: error.message});
                });

        });

        app.post('/_profile/mem/snapshot', function (req, res) {

            logger.info('[POST /_profile/mem] taking memory snapshot');

            nprof.takeMemorySnapshot(di.config.nprof.snapshotPath)
                .then((info) => {
                    logger.info('[POST /_profile/mem] memory snapshot saved to ' + info.filepath);
                    res.json({result: info});
                })
                .catch((error) => {
                    logger.error(error);
                    res.status(500).type('json').json({error: error.message});
                });
        });

        app.get('/_profile/mem/usage', function (req, res) {
            var raw = process.memoryUsage();

            var mem = {};

            if (req.query.scale) {

                var scale = parseInt(req.query.scale);

                for (var key in raw) {
                    mem[key] = raw[key] / scale;
                }

            } else {
                mem = raw;
            }

            res.json({
                result: mem
            });
        });

        app.post('/_profile/gc/start', function (req, res) {

            if (!global.gc) {
                this._logger.warn('no global.gc');
                return res.status(400).json({error: 'no global.gc'});
            }

            logger.info('[/_profile/gc/start] starting gc');

            var before = process.memoryUsage();

            global.gc();

            var after = process.memoryUsage();

            res.json({
                result: {
                    before: before,
                    after: after
                }
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
            logger.info(`pid = ${process.pid}, listen on ${config.host}:${config.port}`);
        });

    })
    .catch((error) => {
        logger.fatal(error);
        throw error;
    });
