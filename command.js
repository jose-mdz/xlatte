#!/usr/bin/env node
/**
 * 2014(c) Goplek
 * JMMP
 * Makes code of latte.ui present on project
 */

var css = require('./latte-css');
var ts =  require('./latte-ts');
var latte =  require('./latte');
var path = require('path');
var strings = require('./latte-strings');
var lmodule = require('./latte-module');
var records = require('./latte-records');
var fs = require('fs');
var io = require('./src/FileInfo');

var FileInfo = io.FileInfo;

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

//region Argument check

var module_name;
var minimize = false;
var verbose = false;
var release = false;
var recordsAny = false;

for(var i = 2; i < process.argv.length; i++){

    var param = process.argv[i].toLowerCase();

    if(param.charAt(0) == '-'){

        if(param === '--minimize') {
            minimize = true;

        }else if(param === '--verbose') {
            verbose  = true;

        }else if(param == '--release') {
            release = true;

        }else if(param == '--recordsany') {
            recordsAny = true;
            global.recordsAny = true;
        }
    }else {
        module_name = param;
    }
}

if(typeof module_name == 'undefined' || module_name.indexOf('--') === 0){
    console.log("\nUsage:\nnxlatte [options] module-name\n" +
        "\nOptions" +
        "\n" +
        "\n--minimize   \tMinimizes the javascript result using Google Closure Compiler" +
        "\n--verbose    \tEchoes information about what script is doing" +
        "\n--release    \tMakes a full release on the latte folder, including PHP files" +
        "\n--recordsAny \tBackwards compat: Record properties will be of type any (TypeScript)" +
        "\n" +
        "\nModule Name: " +
        "\n\t_core      Core module" +
        "\n\t_app       App module" +
        "\n\t[module-name] Module name in datalatte/ folder" +
        "\n\n");
    process.exit();
}
//endregion

//region Echoing
function echo(s){
    if(verbose) {
        console.log(s)
    }
}
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

var moduleDir = new FileInfo(path.join(config.modules, module_name), FileInfo.cwd);


//endregion

/**
 * Create module and records generators
 */
var module = new lmodule.Module(moduleDir.path);
var phpGenerator = new records.PhpRecordsGenerator(module);
var tsGenerator = new records.TsRecordsGenerator(module);

if(!fs.existsSync(module.path)) {
    console.log("Module " +  module_name + " does not exist in " + module.path);
    process.exit();
}

//region Folder paths

var langPath = path.join(module.path, 'lang');
var tsPath = path.join(module.path, 'ts');
var supportPath = path.join(module.path, 'support');
var tsIncludePath = path.join(supportPath, 'ts-include');
var phpPath = path.join(module.path, 'php');
var releasesPath = path.normalize(path.join(process.cwd(), config.output,'releases'));
var releasePath = path.join(releasesPath, module_name);
var releaseSupportPath = path.join(releasePath, 'support');

//endregion

//region Abort if no PHP or TS path
if(!fs.existsSync(tsPath) && !fs.existsSync(phpPath)){
    console.log("Make aborted: no php/ or ts/ directory indicates module is only stub.");
    process.exit(1)
}
//endregion

//region File paths
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

//region Out functions
var doing = function(str){ if(verbose) process.stdout.write(str) }
var done = function(){ if(verbose) console.log("Done") }
//endregion

// TEST
// var phps = io.PhpFileInfoSet.fromFolder(new FileInfo(phpPath));
// phps.release('fragment', FileInfo.cwd);
// process.exit();

// Perform copy of include files
ts.copyIncludes(module);

var activities = [
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
            tsGenerator.generateCode(phpPath, function(tsCode){
                if('string' == typeof tsCode && tsCode.trim().length > 0){
                    latte.writeFileIfNewSync(path.join(tsIncludePath, '/records.ts'), tsCode);
                }
                callback();
            });
        }

    },
    {
        name: " Records Stubs",
        code: function(callback){
            phpGenerator.generateStubs(function(){
                callback();
            });
        }
    },
    {
        name: "Strings files",
        code: function(callback){
            strings.createStringsFiles(langPath, tsDStrings, releasePath, function(){
                callback();
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
        name: "PHP Concatenation",
        code: function(){

            // Delete phps from release folder
            var phps = new FileInfo(releasePath);
            phps.getFiles('php').forEach(function(f){ f.unlink(); });

            if(!release) {
                return;
            }

            // Release Php Files
            var r = io.PhpFileInfoSet.fromFolder(new FileInfo(phpPath)).release(module.name, new FileInfo(releasePath));
            var json = JSON.stringify(module.manifest);
            var stringed = json.replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');

            // Append module.json info
            r.appendString("\n\n$GLOBALS['module-json-" + module.name + "'] = '" + stringed + "';");

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

var dispatchActivity = function(index){

    // Base case
    if(index >= activities.length) {
        return;
    }

    // Let user now
    if(verbose){
        console.log(activities[index].name);
    }

    // Execute Activity

        activities[index].code(function(){
            if(!activities[index].breakpoint === true) {
                dispatchActivity(index + 1)
            }
        });
};

dispatchActivity(0);

//endregion
