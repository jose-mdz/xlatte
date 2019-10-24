/**
 * Created by josemanuel on 9/14/16.
 * Compiles a latte module
 */
const css = require('./latte-css');
const ts =  require('./latte-ts');
const latte =  require('./latte');
const path = require('path');
const strings = require('./latte-strings');
const lmodule = require('./latte-module');
const records = require('./latte-records');
const fs = require('fs');
const io = require('./src/FileInfo');
const FileInfo = io.FileInfo;

exports.compileStack = [];
exports.compileRefs = {};
exports.pushCompile = function(module_name){
    if(exports.compileStack.indexOf(module_name) < 0) {
        exports.compileStack.push(module_name);
    }

    if('undefined' == typeof exports.compileRefs[module_name]){
        exports.compileRefs[module_name] = 1;
    }else{
        exports.compileRefs[module_name]++;
    }

    // console.log("----Compile Stack-----");
    // for(var i in exports.compileStack){
    //     console.log(exports.compileStack[i] + ": " + exports.compileRefs[exports.compileStack[i]]);
    // }
    // console.log("----------------------");
};

/**
 * Returns an array of modules to compile, for specified module.
 * @param module_name
 * @returns {Array}
 */
exports.makeCompileStack = function(module_name){

    exports._addToStack(module_name);

    var modules = [];
    var stack = [];

    for(var i in exports.compileStack){
        modules.push({
            name:  exports.compileStack[i],
            refs: exports.compileRefs[exports.compileStack[i]]
        });
    }

    // Sort by references
    modules.sort(function(a, b){ return a.refs - b.refs });

    // modules.forEach(function(a){console.log(a.name + ": " + a.refs)});
    // Add to stack
    modules.forEach(function(a){stack.push(a.name)});

    return stack;
};

/**
 * Helps makeCompileStack
 * @param module_name
 * @private
 */
exports._addToStack = function(module_name){

    //region Read Config

    var config = {
        modules: 'datalatte',
        output: 'html/datalatte-files'
    };

    if(FileInfo.exists("xlatte.json", FileInfo.cwd)) {
        config = (new FileInfo("xlatte.json")).readAsJSON();

    }else {
        console.log("No xlatte.json present. Using default configuration.");
    }

    //endregion

    //region Abort if module doesn't exist
    var moduleDirPath = path.join(FileInfo.cwd.path, config.modules, module_name);
    if(!fs.existsSync(moduleDirPath)) {
        console.error("Module " +  module_name + " does not exist: " + moduleDirPath);
        callback();
        return;
    }
    //endregion

    //region Initialize Module
    var moduleDir = new FileInfo(moduleDirPath);
    var module = new lmodule.Module(moduleDir.path);
    //endregion

    //region Compile Includes
    exports.pushCompile(module_name);
    if(module.manifest['module-include']) {
        for(var i in module.manifest['module-include']){
            var name = module.manifest['module-include'][i];
            exports.pushCompile(name);
            exports._addToStack(name);
        }
    }
    //endregion
};

/**
 * Compiles the specified module
 * @param module_name
 * @param callback
 */
exports.compile = function(module_name, callback){

    //region Argument check
    callback = callback || function(){}
    var minimize = !!global.minimize;
    var verbose = !!global.verbose;
    var release = !!global.release;
    var force = !!global.force;

    //endregion

    //region Util Functions
    function sprintf() {
        var string = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            string[_i - 0] = arguments[_i];
        }
        var arg = 1, format = arguments[0], cur, next, result = [];
        for (var i = 0; i < format.length; i++) {
            cur = format.substr(i, 1);
            next = i == format.length - 1 ? '' : format.substr(i + 1, 1);
            if (cur == '%' && next == 's') {
                result.push(arguments[arg++]);
                i++;
            }
            else {
                result.push(cur);
            }
        }
        return result.join('');
    }
    function echo(s){
        if(verbose) {
            console.log(s)
        }
    }
    function doing(str){ if(verbose) process.stdout.write(str) }
    function done(){ if(verbose) console.log("Done") }
    //endregion

    //region Read Config

    var config = {
        modules: 'datalatte',
        output: 'html/datalatte-files'
    };

    if(FileInfo.exists("xlatte.json", FileInfo.cwd)) {
        config = (new FileInfo("xlatte.json")).readAsJSON();

    }else {
        echo("No xlatte.json present. Using default configuration.");
    }

    //endregion

    //region Abort if module doesn't exist
    var moduleDirPath = path.join(FileInfo.cwd.path, config.modules, module_name);
    if(!fs.existsSync(moduleDirPath)) {
        console.error("Module " +  module_name + " does not exist: " + moduleDirPath);
        callback();
        return;
    }
    //endregion

    //region Initialize Module
    var moduleDir = new FileInfo(moduleDirPath);
    var module = new lmodule.Module(moduleDir.path);
    //endregion

    //region Folder paths

    var langPath = path.join(module.path, 'lang');
    var tsPath = path.join(module.path, 'ts');
    var supportPath = path.join(module.path, 'support');
    var tsIncludePath = path.join(supportPath, 'ts-include');
    var phpPath = path.join(module.path, 'php');
    var lattePath = path.normalize(path.join(process.cwd(), config.output));
    var releasesPath = path.normalize(path.join(lattePath, 'releases'));
    var releasePath = path.join(releasesPath, module_name);
    var releaseSupportPath = path.join(releasePath, 'support');

    //endregion

    //region Abort if no PHP or TS path
    if(!fs.existsSync(tsPath) && !fs.existsSync(phpPath)){
        console.log("Make aborted: no php/ or ts/ directory indicates module is only stub.");
        callback();
        return;
    }
    //endregion

    //region Check if necessary to compile
    if(!force && !module.necessaryToCompile(releasePath)){
        // console.log("Not necessary to compile " + module_name);
        callback();
        return;
    }
    //endregion

    //region Create File paths
    var jsFile = path.join(tsIncludePath, module_name + '.js');
    var tsDStrings = path.join(tsIncludePath, module_name + '.strings.d.ts');
    var decFile = path.join(tsIncludePath, module_name + '.d.ts');
    var jsFinalFile = path.join(releasePath, module_name + '.js');
    var cssFile = path.join(releasePath, module_name + '.css');
    //endregion

    //region Create folders if necessary

    if(!fs.existsSync(releasesPath)) {
        fs.mkdirSync(releasesPath);
    }

    if(!fs.existsSync(releasePath)){
        fs.mkdirSync(releasePath);
    }

    latte.supermkdir(tsIncludePath);

    //endregion

    var activities = [
        {
            name: "Echo",
            code: function(callback){
                console.log("Compiling " + module_name);
                callback();
            }
        },
        {
            name: "Copying Include Files",
            code: function(callback){
                ts.copyIncludes(module);
                callback();
            }
        },
        {
            name: "Copying xlatte.json",
            code: function(callback){

                FileInfo.createFile(path.join(lattePath, 'xlatte.json'), JSON.stringify(config));
                callback();
            }
        },
        {
            breakpoint: false,
            name: "Before Make",
            code: function(callback){
                module.beforeMake(callback);
            }
        },
        {
            name: "PHP Records",
            code: function(callback){
                var phpGenerator = new records.PhpRecordsGenerator(module);
                phpGenerator.generateCode(function(phpCode){

                    if(phpCode){
                        latte.writeFileIfNewSync(path.join(module.path, '/support/records.php'), phpCode);
                    }
                    callback();
                });
            }
        },
        {
            name: "TypeScript Records",
            code: function(callback){
                var tsGenerator = new records.TsRecordsGenerator(module);
                tsGenerator.generateCode(phpPath, function(tsCode){
                    if('string' == typeof tsCode && tsCode.trim().length > 0){
                        latte.writeFileIfNewSync(path.join(tsIncludePath, '/records.ts'), tsCode);
                    }
                    callback();
                });
            }

        },
        {
            name: "Records Stubs",
            code: function(callback){
                var phpGenerator = new records.PhpRecordsGenerator(module);
                phpGenerator.generateStubs(function(){
                    callback();
                });
            }
        },
        {
            name: "Strings files",
            code: function(callback){
                strings.createStringsFiles(langPath, tsDStrings, releasePath, function(){
                    if(release){

                        // Copy language files to release folder
                        var lp = FileInfo.exists(langPath) ? new FileInfo(langPath) : null;
                        if(lp) {
                            FileInfo.findFiles(lp, 'txt').forEach(function(f){
                                FileInfo.createFile(path.join(releasePath, f.name), f.readAsString())
                            });
                        }

                        callback();

                    }else{
                        callback();
                    }
                });
            }
        },
        {
            name: "CSS",
            code: function(callback){
                css.generateCss(moduleDir.path, cssFile, function(){
                    callback();
                });
            }
        },
        {
            name: "View Extract",
            code: function(callback){

                if(FileInfo.exists('view', moduleDir)) {

                    // Extractor module
                    var xt = require('./src/ViewExtractor');

                    // Get class data
                    var infos = xt.ViewExtractor.instance.extractFolder(new FileInfo('view', moduleDir));

                    // Create content
                    var content = '';
                    var html = {};

                    // Concatenate views
                    for (var i = 0; i < infos.length; i++) {
                        content += infos[i].source;
                        html[infos[i].className] = infos[i].html;
                    }

                    // Write views file
                    latte.writeFileIfNewSync(path.join(tsIncludePath, 'views.ts'), content);

                    // Write views sources
                    latte.writeFileIfNewSync(path.join(tsIncludePath, 'views_bank.ts'),
                        sprintf("module latte{ \n    window['latte']['globalViewsBank'] = _merge( window['latte']['globalViewsBank'] || {}, %s) \n}", JSON.stringify(html, null, 4)));
                }

                callback();
            }
        },
        {
            name: "TypeScript Compile",
            code: function(callback){
                ts.compileDirectory(tsIncludePath, tsPath, jsFile, function(){

                    // Move .js to release
                    fs.renameSync(jsFile, jsFinalFile);

                    callback();
                });
            }
        },
        {
            name: "PHP Release",
            code: function(callback){

                // Delete phps from release folder
                var phps = new FileInfo(releasePath);
                phps.getFiles('php').forEach(function(f){ f.unlink(); });

                if(release) {
                    var pp = FileInfo.exists(phpPath) ?  new FileInfo(phpPath) : null;
                    var rp = new FileInfo(releasePath);
                    var r = FileInfo.createFile(io.PhpFileInfoSet.releasePath(module.name, rp), '<?php\n');

                    // Append Records
                    if(FileInfo.exists('records.php', new FileInfo(supportPath))) {
                        var records = new FileInfo(path.join(supportPath, 'records.php'));
                        var content = records.readAsString();
                        if(content.indexOf('<?') === 0) {
                            content = content.substr(content.indexOf('\n'));
                        }
                        r.appendString('\n\n' + content);
                    }

                    // Append Php Files
                    if(pp) {
                        r = io.PhpFileInfoSet.fromFolder(pp).release(module.name, new FileInfo(releasePath));
                    }

                    // Append module.json info
                    var json = JSON.stringify(module.manifest);
                    var stringed = json.replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
                    var mj = path.join(releasePath, 'module.json.php');
                    FileInfo.createFile(mj, "<?php\n\n$GLOBALS['module-json-" + module.name + "'] = \"" + stringed + "\";");
                }

                callback();
            }
        },
        {
            name: "Files Export",
            code: function(callback){
                module.exportFiles(releaseSupportPath, function(){
                    callback();
                });
            }
        },
        {
            name: "Minimize",
            code: function(callback){
                if(minimize) {

                    var gcc = require('./gcc-rest');

                    // Set Closure Compiler parameters
                    gcc.params({
                        compilation_level: "WHITESPACE_ONLY"
                    });

                    // Add files that should be compiled
                    gcc.addFiles(jsFinalFile);

                    // Replace code before compiling
                    gcc.replace(/'use strict';/g, '');

                    // Compile and write output to compiled.js
                    gcc.output(jsFinalFile);

                    // Go
                    gcc.callback = callback;
                }else{
                    callback();
                }
            }
        },
        {
            name: "After Make",
            code: function(callback){
                module.afterMake(callback);
            }
        }
    ];

    //region Execute Activities

    var dispatchActivity = function(){

        if(activities.length > 0) {
            var activity = activities.shift();

            if(verbose) {
                console.log(activity.name);
            }

            if(activity.breakpoint === true) {
                return;
            }

            activity.code(function(){
                dispatchActivity()
            });

        }else {
            // Base Case
            callback();
        }

        // // Base case
        // if(index >= activities.length) {
        //     callback();
        // }

        // // Let user now
        // if(verbose){
        //     console.log(activities[index].name);
        // }

        // // Execute Activity
        //
        // activities[index].code(function(){
        //     if(!activities[index].breakpoint === true) {
        //         dispatchActivity()
        //     }
        // });
    };

    dispatchActivity();

    //endregion
};