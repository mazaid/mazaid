var path = require('path');

var _ = require('lodash');
var joi = require('joi');

var Rest = require('maf/Rest');

var addRestModules = function (di, rest, restModules) {
    var promises = [];

    _.each(restModules, (restModule) => {
        promises.push(rest.addMany(restModule, di));
    });

    return Promise.all(promises);
};

module.exports = function(logger, app, di) {

    return new Promise((resolve, reject) => {

        var restConfig = {
            baseUrl: '/',
            title: 'mazai.d REST API',
            description: ''
        };

        if (di.config.private) {
            restConfig.title = `[private] ${restConfig.title}`;
        }

        var rest = new Rest(logger, app, restConfig);

        var restModules = {
            checks: 'mazaid-rest-checks',
            checkTasks: 'mazaid-rest-check-tasks',
            execTasks: 'mazaid-rest-exec-tasks'
        };

        var promises = [];

        for (name in restModules) {
            var packageName = restModules[name];
            promises.push(addRestModules(di, rest, require(`${packageName}/rest`)));
        }

        Promise.all(promises)
            .then(() => {
                resolve(rest.init());
            })
            .catch((error) => {
                reject(error);
            });

        // var execTasksRest = require('mazaid-rest-exec-tasks/rest');
        //
        // var promises = [];
        //
        // _.each(restModules, (restModule) => {
        //     promises.push(rest.addMany(restModule, di));
        // });
        //
        // Promise.all(promises)
        //     .then(() => {
        //         resolve(rest.init());
        //     })
        //     .catch((error) => {
        //         reject(error);
        //     });

    });

};
