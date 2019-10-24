// import fs               = require('fs');
// import path             = require('path');
// import child_process    = require('child_process');
import * as path from "path";
import * as fs from "fs";
import * as child_process from "child_process";
/**
 * sprintf for only %s strings
 */
function sprintf(...string) {
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
;
/**
 * Represents a file or a directory.
 * This class can only represent existing files.
 * To create files use static methods createFile and createDirectory.
 */
export class FileInfo {
    //region Static
    /**
     * Joins the given name and the path of the file, if any.
     * @param name
     * @param f
     * @returns {string}d
     */
    static joinPath(name, f = null) {
        var p = name;
        if (f instanceof FileInfo) {
            p = path.join(f.path, p);
        }
        return p;
    }
    /**
     * Concatenates the contents of the specified files into one file
     * @param files
     * @param outFile
     */
    static concatenate(files, outFile) {
        for (var i in files) {
            fs.appendFileSync(outFile, files[i].readAsString());
        }
    }
    /**
     * Creates the specified directory.
     * The parent directory may be specified.
     *
     * @param name
     * @param parentDirectory
     */
    static createDirectory(name, parentDirectory = null) {
        // Get path
        var p = FileInfo.joinPath(name, parentDirectory);
        // Mk Dir
        fs.mkdirSync(p);
        // Return created directory
        return new FileInfo(p);
    }
    /**
     * Checks the specified file exists.
     *
     * @param path
     * @param base
     */
    static exists(name, directory = null) {
        return fs.existsSync(FileInfo.joinPath(name, directory));
    }
    /**
     * Creates the specified file with the specified content.
     * The parent directory may be specified.
     *
     * @param name
     * @param content
     * @param directory
     */
    static createFile(name, content, directory = null) {
        // Get path
        var p = FileInfo.joinPath(name, directory);
        // Write file
        fs.writeFileSync(p, content, {
            encoding: 'utf8'
        });
        // Return created file
        return new FileInfo(p);
    }
    /**
     * (Deeply) Finds files on the specified directory
     * @param directory
     * @param extension
     * @returns {FileInfo[]}
     */
    static findFiles(directory, extension = null) {
        var results = [];
        var files = directory.getFiles();
        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            if (f.isDirectory) {
                results = results.concat(FileInfo.findFiles(f, extension));
            }
            else if (f.extensionCheck(extension)) {
                results.push(f);
            }
        }
        return results;
    }
    /**
     * Gets the current working directory
     *
     * @returns {FileInfo}
     */
    static get cwd() {
        return new FileInfo(process.cwd());
    }
    //endregion
    /**
     * Creates the file
     *
     * @param path
     * @param base
     */
    constructor(path, base = null) {
        // Set the real path
        this._path = fs.realpathSync(FileInfo.joinPath(path, base));
    }
    //region Private Methods
    /**
     * Returns a value indicating if the file passes an extension check. If no value provided for extension, check
     * will be true
     * @param extension
     * @returns {boolean}
     */
    extensionCheck(extension) {
        if ('string' == typeof extension && extension.length > 0) {
            return this.extension.toLowerCase() == extension.toLowerCase();
        }
        return true;
    }
    //endregion
    //region Methods
    /**
     * Appends the data to the file
     * @param data
     */
    appendString(data) {
        fs.appendFileSync(this.path, data);
    }
    /**
     * Copies the file to the specified destination folder
     *
     * @param destination
     */
    copy(destination, newName = null) {
        if (this.isDirectory) {
            throw "Can't copy a folder";
        }
        var dest = path.join(destination.path, newName || this.name);
        var contents = fs.readFileSync(this.path);
        fs.writeFileSync(dest, contents);
    }
    /**
     * Gets the child files of the file, if its a directory.
     */
    getFiles(extension = null) {
        if (!this.isDirectory)
            return [];
        var files = fs.readdirSync(this.path);
        var result = [];
        for (var i = 0; i < files.length; i++) {
            var f = new FileInfo(path.join(this.path, files[i]));
            if (f.extensionCheck(extension)) {
                result.push(f);
            }
        }
        return result;
    }
    /**
     * Reads the file as a String
     * @param encoding
     */
    readAsString(encoding = 'utf8') {
        return fs.readFileSync(this.path, { encoding: encoding });
    }
    /**
     * Reads the file and returns the JSON inside of it.
     * @param encoding
     * @returns {any}
     */
    readAsJSON(encoding = 'utf8') {
        return JSON.parse(this.readAsString(encoding));
    }
    /**
     * Deletes the file
     */
    unlink() {
        fs.unlinkSync(this.path);
    }
    /**
     * Writes the specified string as the data of the file
     * @param data
     * @param mode
     * @param flag
     */
    writeString(data, mode = 438, flag = 'w') {
        fs.writeFileSync(this.path, data, {
            encoding: 'utf8',
            mode: mode,
            flag: flag
        });
    }
    //endregion
    //region Properties
    /**
     * Gets the last accessed time
     *
     * @returns {Date}
     */
    get accessed() {
        return new Date(String(this.stats.atime));
    }
    /**
     * Gets the extension of the file, without the dot.
     *
     * @returns {string}
     */
    get extension() {
        var index = this.path.lastIndexOf('.');
        if (index >= 0 && index < this.path.length) {
            return this.path.substr(index + 1);
        }
        else {
            return '';
        }
    }
    /**
     * Gets a value indicating if the file is a directory
     *
     * @returns {boolean}
     */
    get isDirectory() {
        return this.stats.isDirectory();
    }
    /**
     * Gets the name of the file or directory
     *
     * @returns {string}
     */
    get name() {
        return path.basename(this.path);
    }
    /**
     * Gets the path of the file
     *
     * @returns {string}
     */
    get path() {
        return this._path;
    }
    /**
     * Gets the size of the file in bytes
     *
     * @returns {number}
     */
    get size() {
        return this.stats.size;
    }
    /**
     * Gets the stats
     *
     * @returns {Stats}
     */
    get stats() {
        if (!this._stats) {
            this._stats = fs.statSync(this.path);
        }
        return this._stats;
    }
    /**
     * Gets the modification date
     *
     * @returns {Date}
     */
    get modified() {
        return new Date(String(this.stats.mtime));
    }
}
/**
 * Represents a typescript file
 */
export class TsFileInfo extends FileInfo {
    /**
     * Gets the class info of the file
     *
     * @returns {TsClassInfo}
     */
    get classInfo() {
        if (!this._classInfo) {
            this._classInfo = {
                isClass: false,
                references: 0
            };
            // Read file
            var data = this.readAsString();
            // Get matches
            var matches = data.match(/export\s+class\s+(\w*)(\s+extends\s+([\w|\.]*))?/i);
            if (matches && matches.length > 1) {
                this._classInfo = {
                    isClass: true,
                    className: matches[1],
                    extendsClass: matches[3],
                    references: 0
                };
            }
        }
        return this._classInfo;
    }
    /**
     * Gets the name of the class in the file
     *
     * @returns {string}
     */
    get className() {
        return this.classInfo.className || null;
    }
    /**
     * Gets a value indicating if the file contains a class
     *
     * @returns {boolean}
     */
    get isClass() {
        return this.classInfo.isClass;
    }
}
/**
 * Represents a set of TsFile objects, and enables tsc compiling of them.
 */
export class TsFileInfoSet {
    //region Static
    /**
     * Creates a TS file set from the specified folder path
     *
     * @param path
     * @returns {TsFileInfoSet}
     */
    static byPath(path) {
        return TsFileInfoSet.byFolder(new FileInfo(path));
    }
    /**
     * Creates a TS file set from the specified folder
     *
     * @param f
     * @returns {TsFileInfoSet}
     */
    static byFolder(f) {
        var files = FileInfo.findFiles(f, 'ts');
        var ts = [];
        // Fill ts array
        for (var i in files)
            ts.push(new TsFileInfo(files[i].path));
        return new TsFileInfoSet(ts);
    }
    //endregion
    /**
     * Creates the set of TS files of the specified TsFileInfo objects
     * @param files //erase this
     */
    constructor(files) {
        this._files = files;
    }
    //region Private Methods
    /**
     * Returns a value indicating if the specified base class extends the specified super class
     *
     * @param baseClass
     * @param superClass
     */
    classExtends(baseClass, superClass) {
        if (!baseClass)
            return false;
        if (baseClass.extendsClass == superClass.className) {
            return true;
        }
        else if ('string' == baseClass.extendsClass) {
            return this.classExtends(this.byClass(baseClass.className), superClass);
        }
        else {
            return false;
        }
    }
    /**
     * Finds the references between files, by updating classInfo.references
     */
    updateReferences() {
        for (var i = 0; i < this.classFiles.length; i++) {
            for (var j = 0; j < this.classFiles.length; j++) {
                if (this.classExtends(this.classFiles[j].classInfo, this.classFiles[i].classInfo)) {
                    this.classFiles[i].classInfo.references++;
                }
            }
        }
    }
    /**
     * Gets the class files sorted by its reference (Most referenced first)
     */
    getClassFilesSortedByReference() {
        // Update References
        this.updateReferences();
        var r = [];
        // Initially fill result
        for (var i in this.classFiles)
            r.push(this.classFiles[i]);
        // Sort now
        r.sort((a, b) => {
            return b.classInfo.references - a.classInfo.references;
        });
        return r;
    }
    /**
     * Gets the files in order to compile
     */
    getFilesInCompileOrder() {
        var r = [];
        // Add non-class files
        for (var i in this.nonClassFiles)
            r.push(this.nonClassFiles[i]);
        // Get classes sorted by reference
        var sorted = this.getClassFilesSortedByReference();
        // Add sorted class files
        for (var i in sorted)
            r.push(sorted[i]);
        return r;
    }
    //endregion
    //region Methods
    /**
     * Returns the file having the specified class. Null if not found.
     *
     * @param className
     */
    byClass(className) {
        for (var i = 0; i < this.classFiles.length; i++) {
            if (this.classFiles[i].className == className) {
                return this.classFiles[i];
            }
        }
        return null;
    }
    /**
     * Compiles the files on the set
     * @param options
     * @param callback
     */
    compile(options, callback) {
        var sorted = this.getFilesInCompileOrder();
        var files = [];
        var actualOptions = [
            "--target ES5"
        ];
        // Module option
        if ('string' == typeof options.module) {
            actualOptions.push(sprintf('-m %s', options.module));
        }
        // Out file option
        if ('string' == typeof options.file) {
            actualOptions.push(sprintf("--out %s", options.file));
        }
        // Declaration
        if (options.declaration === true) {
            actualOptions.push('-d');
        }
        // Remove comments
        if (options.removeComments === true) {
            actualOptions.push('--removeComments');
        }
        // No implicit any
        if (options.noImplicitAny === true) {
            actualOptions.push('--noImplicitAny');
        }
        // Gather files
        for (var i in sorted) {
            files.push(sprintf('"%s"', sorted[i].path));
        }
        // Execute compile process
        child_process.exec(sprintf("tsc %s %s", actualOptions.join(' '), files.join(' ')), callback);
    }
    /**
     * Gets the files who contains a class
     *
     * @returns {TsFileInfo[]}
     */
    get classFiles() {
        if (!this._classFiles) {
            this._classFiles = [];
            for (var i = 0; i < this.files.length; i++) {
                if (this.files[i].isClass)
                    this._classFiles.push(this.files[i]);
            }
        }
        return this._classFiles;
    }
    /**
     * Gets the files of the set
     *
     * @returns {TsFileInfo[]}
     */
    get files() {
        return this._files;
    }
    /**
     * Gets the files who are not a class
     *
     * @returns {TsFileInfo[]}
     */
    get nonClassFiles() {
        if (!this._nonClassFiles) {
            this._nonClassFiles = [];
            for (var i = 0; i < this.files.length; i++) {
                if (!this.files[i].isClass)
                    this._nonClassFiles.push(this.files[i]);
            }
        }
        return this._nonClassFiles;
    }
}
export class PhpFileInfo extends FileInfo {
}
/**
 * Represents a set of php files in the latte project
 */
export class PhpFileInfoSet {
    //region Static
    /**
     * Creates the set from finding php files in the specified folder
     * @param folder
     * @returns {PhpFileInfoSet}
     */
    static fromFolder(folder) {
        let files = FileInfo.findFiles(folder, 'php');
        let r = [];
        files.forEach((f) => r.push(new PhpFileInfo(f.path)));
        return new PhpFileInfoSet(r);
    }
    //endregion
    constructor(files) {
        this._files = files;
    }
    //region Methods
    /**
     * Makes the latte release to the specified path
     * @param path
     */
    release(moduleName, out) {
        let eventFiles = [];
        let outPath = PhpFileInfoSet.releasePath(moduleName, out);
        // if(FileInfo.exists(outPath)) {
        //     (new FileInfo(outPath)).writeString('');
        // }
        this.files.forEach((f) => {
            if (f.name.indexOf('_') === 0) {
                eventFiles.push(f);
            }
            else {
                let contents = f.readAsString();
                if (contents.indexOf('<?') === 0) {
                    contents = contents.substr(contents.indexOf('\n') + 1);
                }
                fs.appendFileSync(outPath, contents);
            }
        });
        eventFiles.forEach((f) => {
            FileInfo.createFile(FileInfo.joinPath(f.name, out), f.readAsString());
        });
        return new FileInfo(outPath);
    }
    /**
     * Gets
     * @param moduleName
     * @param out
     * @returns {string}
     */
    static releasePath(moduleName, out) {
        return FileInfo.joinPath(sprintf("%s.php", moduleName), out);
    }
    /**
     * Gets the files of the set
     *
     * @returns {PhpFileInfo[]}
     */
    get files() {
        return this._files;
    }
}
// Get arguments
//var args = process.argv.slice(2);
