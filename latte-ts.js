/**
 * 2014(c) Goplek
 * JMMP
 *
 * Functions for compiling TypeScript of latte code
 */

let fs = require('fs');
let latte = require('./latte');
let mod = require('./latte-module');
let path = require('path');
let sys = require('util');

/**
 * Copies the necessary includes of the module
 *
 * @param module
 */
exports.copyIncludes = function(module){

    if(!(module instanceof mod.Module)){
        throw "module must be an instance of latte.Module";
    }

    if(!fs.existsSync(module.pathTsInclude)) {
        return;
    }

    //region Remove existent files
    let existentFiles = latte.walkSync(module.pathTsInclude, '.ts');
    for(let i = 0; i < existentFiles.length; i++){
        if(!existentFiles[i].endsWith('records.ts')){
            fs.unlinkSync(existentFiles[i]);    
        }
    }
    //endregion

    //region Copy specified ts-includes
    let includes = module.manifest['ts-include'];

    if(includes instanceof Array) {
        for(let i = 0; i < includes.length; i++){
            latte.fileCopy(
                path.join(module.pathSupport, includes[i]),
                path.join(module.pathTsInclude, path.basename(includes[i]))
            )
        }
    }
    //endregion

    //region Copy includes because of module-includes
    let mincludes = module.manifest['module-include'];

    if(mincludes instanceof Array) {
        for(let i = 0; i < mincludes.length; i++){

            // Load included module
            let mincluded = new mod.Module(path.join(module.folderPath, mincludes[i]));
            let files = latte.walkSync(mincluded.pathTsInclude, '.ts');

            for(let j = 0; j < files.length; j++){
                //console.log("Including: " + files[j])

                let basename = path.basename(files[j]);

                // Files that souldn't be included:
                let exclusions = "records.ts;views.ts;views_bank.ts";

                // Copy files
                if(exclusions.indexOf(basename) < 0){
                    latte.fileCopy(
                        files[j],
                        path.join(module.pathTsInclude, path.basename(basename))
                    )
                }
            }

        }

    }
    //endregion

}

/**
 * Creates the JS file of the module by compiling the TS Code
 *
 * @param tsIncludePath Path of extra ts files to include to compiler
 * @param directory Directory of files
 * @param outFile Path of file
 */
exports.compileDirectory = function(tsIncludePath, directory, outFile, callback){

    /**
     * 1. Find *.ts files in tsPath
     */
    latte.walk(tsIncludePath, '.ts', function(err, files){

        /**
         * 2. Create references file
         */
        createTsReferencesFile(files, directory, function(){

            /**
             * 3. Compile TS
             */
            compileTs(directory, outFile, function(){
                if(typeof callback === 'function'){
                    callback.call(null);
                }
            });

        });
    });

};

/**
 * Invokes
 *
 * @param directory
 * @param outFile
 * @param callback
 */
function compileTs(directory, outFile, callback){
    let out_path = outFile;
    let all_path = path.join(directory, 'all.ts');

    //tsc -d --removeComments --target ES6 --out $outputdir/latte.js $all
    let exec = require('child_process').exec;
    let child;

    child = exec("tsc -d --target ES6 --out " + out_path + ' ' + all_path, function(error, stdout, stderr){
        if(stdout)
            console.log(stdout);

        if(stderr){
            let err = stderr.replace(/\(([0-9]+),([0-9])+\):/g, ":$1:$2 ");

            let parts = err.split("\n");

            for(let i = 0; i < parts.length; i++){
                if(parts[i].trim()){
                    parts[i] = "(" + (i + 1) + ") at " + parts[i];
                }
            }

            sys.error(parts.join("\n"));
        }else{
            fs.unlinkSync(all_path);
        }

        if(typeof callback === 'function'){


            callback.call(this);
        }

    });
};

/**
 * Creates the references files (all.ts), based on the hierarchy of class inheritance.
 *
 * @param directory
 * @param includes Array with extra files to include
 * @param callback (filePath: string)
 */
function createTsReferencesFile(includes, directory, callback){


    let ts_path = directory;
    let all_path = path.join(directory, 'all.ts');

    // Remove previously created references file
    if(fs.existsSync(all_path)){
        fs.unlinkSync(all_path);
    }

    /**
     * 1. Find *.ts files
     */
    let results = fs.existsSync(ts_path) ? latte.walkSync(ts_path, '.ts') : [];
    let classInfo = [];
    let ignoredFiles = [];
    let served = 0;

    /**
     * 2. For each found file
     */
    for(let i = 0; i < results.length; i++){

//            console.log("FOUND: " + results[i]);

        /**
         * 3. Get Information of file
         */
        getClassInfo(results[i], function(info){

            if(info.isClass){
                classInfo.push(info);
            }else{
                ignoredFiles.push(info.path);
            }

            // If all files served
            if(results.length === ++served){

                /**
                 * 4. Find references
                 */
                findReferences(classInfo);

                /**
                 * 5. Sort by references
                 */
                sortByReferences(classInfo);

                //console.log(JSON.stringify(classInfo))

                let references = [];
                let code = '';

                /**
                 * 6.0 Dump include files
                 */
                (includes || []).forEach(function(inc){
                    references.push(inc);
                });
                // for(let j = 0; j < includes.length; j++)
                //     references.push(includes[j]);

                /**
                 * 6.1 Dump non-class files
                 */
                for(let j = 0; j < ignoredFiles.length; j++)
                    references.push(ignoredFiles[j]);

                /**
                 * 7. Dump sorted paths
                 */
                for(let j = 0; j < classInfo.length; j++)
                    references.push(classInfo[j].path);

                /**
                 * 8. Gather references for code
                 */
                for(let j = 0; j < references.length; j++){
                    code += '\n' + '/// <reference path="' + path.resolve(references[j]) + '" />';
                }

                /**
                 * 9. Write references file
                 */
                latte.writeFileIfNew(all_path, code, function(ex){
                    if(ex)throw ex;

                    if(typeof callback === 'function'){
                        callback.call(this, all_path);
                    }
                });


            }

        });
    }


}

/**
 * Returns a value indicating if the specified string ends in the specified postfix
 *
 * @param string
 * @param postfix
 * @returns {boolean}
 */
function endsWith(string, postfix){
    return string.substr(string.length - postfix.length, postfix.length) === postfix;
}

/**
 * Returns a value indicating if the baseClass implements superClass
 *
 * @param baseClassInfo Information about base class
 * @param superClassInfo Information about super class
 * @param infos List of all classes info
 * @returns {boolean}
 */
let _extends = function(baseClassInfo, superClassInfo, infos){

    if(!baseClassInfo) return false;

    if(typeof infos[baseClassInfo.className] == 'undefined'){
        //console.log("NOT FOUND: " + baseClassInfo.className)
        return false;
    }

    if(baseClassInfo.extends == superClassInfo.className){
        //console.log(baseClassInfo.className + " -> " + superClassInfo.className)
        return true;
    }else{
        if(typeof baseClassInfo.extends == 'string'){
            return _extends(infos[baseClassInfo.extends], superClassInfo, infos);
        }else{
            //console.log("NOT EXTEND: " + baseClassInfo.className + " -> " + superClassInfo.className)
            return false;
        }
    }

}

/**
 * Scans the array and assigns references to class info
 *
 * @param {Array<ClassInfo>} infos
 */
function findReferences(infos){

    let metas = {};

    for(let j = 0; j < infos.length; j++) metas[infos[j].className] = infos[j];

    // Time to Count references
    for(let j = 0; j < infos.length; j++){
        for(let k = 0; k < infos.length; k++){
            if(_extends(infos[k], infos[j], metas)){
                infos[j].references++;
            }
        }

        if(endsWith(infos[j].path, 'records.ts')) infos[j].references = infos.length;
    }
};

/**
 * Returns information about the class on the specified class
 *
 * @param path
 * @param callback
 */
function getClassInfo(path, callback){

    // Read file
    fs.readFile(path, 'utf8', function(err, data){

        let result = {
            isClass: false,
            path: path,
            source: data
        };

        if(!err){

            // Get matches
//            let matches = data.match(/export\s+class\s+(\w*)(\s+extends\s+([\w|\.]*))?/i);
            let matches = data.match(/export\s+class\s+(\w*)<[\w\s,]*>(\s+extends\s+([\w|\.]*))<[\w\s,]*>?/i);

            if(matches === null) {
                matches = data.match(/export\s+class\s+(\w*)<[\w\s,]*>(\s+extends\s+([\w|\.]*))/i);
            }

            if(matches === null){
                matches =  data.match(/export\s+class\s+(\w*)(\s+extends\s+([\w|\.]*))?/i);
            }

            // Patch
            if(data) {

            }

            if(matches && matches.length > 1){

                result = {
                    isClass: true,
                    path: path,
                    className: matches[1],
                    extends: matches[3],
                    references: 0,
                    properties: {},
                    source: data
                };

                // Get properties
                matches = data.match(/get\s+\w+\s*\(\s*\)\s*:\s*[\w<>\.]+/g);

                for(let i in matches){
                    let match = matches[i];
                    let parts = match.match(/get\s+(\w+)\s*\(\s*\)\s*:\s*([\w<>\.]+)/i);

                    if(parts.length >= 2){
                        // Part 0 is match, Part 1 is first group (property name)
                        result.properties[parts[1]] = {
                            //source: match,
                            type: parts[2]
                        }
                    }
                }

            }
        }

        //console.log(result.className + " ---extends--> " + result.extends)
        callback.call(this, result);
    });
}

/**
 * Sorts the array of classes info by references count
 *
 * @param {Array<ClassInfo>} infos
 */
function sortByReferences(infos){
    // Bubble sort'em
    let swapped;
    do{

        swapped = false;

        for(let j = 0; j < infos.length - 1; j++){

            if( infos[j + 1].references > infos[j].references ){
                let tmp = infos[j];
                infos[j] = infos[j+1];
                infos[j+1] = tmp;
                swapped = true;
            }

        }
    }while(swapped);
}