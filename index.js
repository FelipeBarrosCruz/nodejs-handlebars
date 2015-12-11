'use strict';

let express     = require('express'),
    colors      = require('colors'),
    async       = require('async'),
    fs          = require('fs'),
    handlebars  = require('handlebars'),
    APP_PORT    = 3232;

let templateConfiguration = {
    dir: '/var/html/handlebars/tpls/',
    files: {
        header: 'header.tpl',
        footer: 'footer.tpl'
    }
};

let routesConfiguration = {
    '/': MainController
};

new Application().registerTemplates(templateConfiguration).registerRoutes(routesConfiguration).run(APP_PORT);

function MainController(req, res, next) {

    ReadTemplateFiles({
        dir: '/var/html/handlebars/pages/',
        files: {
            index: 'index.tpl'
        }
    }, function onResolve(status, result) {

        let html = handlebars.compile(result.index);

        res.writeHeader(200, {"Content-Type": "text/html"});
        res.write(html());
        res.end();

    });
};

function Application() {
    let app      = express(),
        appTasks = [];

    let publicInterface = {
        registerTemplates:  registerTemplates,
        registerRoutes:     registerRoutes,
        run:                runApp
    };

    function registerTemplates(configuration) {
        appTasks.push(function registerTemplatesTask(next) {
            ReadTemplateFiles(configuration, function onResult(status, result) {

                if (!status) {
                    console.log('Cannot register partials'.red);
                    return next(null);
                }

                for (var template in result) {
                    console.log('Register template'.cyan + ' [%s] '.yellow + 'with success'.cyan, template);
                    handlebars.registerPartial(template, result[template]);
                }

                next(null);
            });
        });

        return publicInterface;
    };

    function registerRoutes(routes) {
        appTasks.push(function registerRoutesTask(next) {
            for(let name in routes) {
                console.log('Register'.cyan + ' [%s] '.yellow + 'router'.cyan, name);
                app.use(
                    '/${name}'.replace('${name}', name),
                    routes[name]
                );
            }

            next(null);
        });

        return publicInterface;
    };

    function runApp(port) {
        async.waterfall(appTasks, function onResultRunApp() {
            app.listen(port, function() {
                console.log('App running on'.green + ' [%s]'.yellow, APP_PORT);
            });
        });

        return publicInterface;
    };

    return publicInterface
};

function ReadTemplateFiles(configuration, cb) {

    let response = {};

    let asyncReadFileTasks = [function defaultTask(next) {
        next(null, true);
    }];

    let pushTask = function(name, file) {
        asyncReadFileTasks.push(function readFileTask(status, next) {

            if (!status) {
                return next(err, status);
            }

            fs.readFile(file, 'utf8', function onResultReadFile(err, result) {
                if (err) {
                    console.log('Some error happend when read %s file'.red, name);
                    return next(err, false);
                }

                response[name] = result;
                return next(null, true);
            });
        });
    };

    let dir   = configuration.dir,
        files = configuration.files || [];

    for(let name in files) {
        pushTask(name, dir.concat(files[name]));
    }

    async.waterfall(asyncReadFileTasks, function onResult(err, status) {
        status  = (err || !status)
                ? false
                : true;

        cb(status, response);
    });
};