#!/usr/bin/env node
/**
 * 2014 - JMMP
 * 2016 - Latest
 */

//region Argument check

let module_name;

for(let i = 2; i < process.argv.length; i++){

    let param = process.argv[i].toLowerCase();

    if(param.charAt(0) === '-'){

        if(param === '--minimize') {
            global.minimize = true;

        }else if(param === '--verbose') {
            global.verbose  = true;

        }else if(param === '--release') {
            global.release = true;

        }else if(param === '--recordsany') {
            global.recordsAny = true;

        }else if(param === '--records'){
            global.doRecords = true;

        }else if(param === '--force'){
            global.force = true;
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
        "\n--force      \tForces compilation of already compiled modules" +
        "\n" +
        "\nModule Name: " +
        "\n\t_core      Core module" +
        "\n\t_app       App module" +
        "\n\t[module-name] Module name in datalatte/ folder" +
        "\n\n");
    process.exit();
}
//endregion

let compiler = require('./latte-compiler');

if(module_name) {

    let stack = compiler.makeCompileStack(module_name);

    // Compiles the next entry of the stack
    let dispatch = function(){
        if(stack.length > 0) {
            let module_name = stack.pop();
            compiler.compile(module_name, function(){
                // console.log("Compiled " +  module_name + ".");
                dispatch(); });
        }
    };

    dispatch();
}

