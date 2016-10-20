var path = require('path');
var express = require('maf/vendors/express');
var logger = require('maf/Service/Logger')('mazaid');

var nprofExpressRegister = require('nprof/express/register');

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

        nprofExpressRegister(logger, app, di.config.nprof);

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
