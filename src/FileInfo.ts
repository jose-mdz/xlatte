
// import fs               = require('fs');
// import path             = require('path');
// import child_process    = require('child_process');

import * as path from "path";
import * as fs from "fs";
import * as child_process from "child_process";

/**
 * sprintf for only %s strings
 */
function sprintf(...string): string{

    var arg = 1, format = arguments[0], cur, next, result = [];

    for(var i = 0; i < format.length; i++){

        cur = format.substr(i, 1);
        next = i == format.length - 1 ? '' : format.substr(i + 1, 1);

        if (cur == '%' && next == 's'){
            result.push(arguments[arg++]);
            i++;
        }else{
            result.push(cur);
        }
    }

    return result.join('');
}

/**
 * Represents a TypeScript code file
 */
export interface TsClassInfo{
    isClass: boolean;
    className?: string;
    extendsClass?: string;
    references?: number
}

/**
 * Options for compiling TypeScript
 */
export interface TscOptions{
    file?: string;
    module?: string;
    declaration?: boolean;
    removeComments?: boolean;
    noImplicitAny?: boolean;
}

/**
 * Represents a file or a directory.
 * This class can only represent existing files.
 * To create files use static methods createFile and createDirectory.
 */
export class FileInfo{

    //region Static

    /**
     * Joins the given name and the path of the file, if any.
     * @param name
     * @param f
     * @returns {string}d
     */
    static joinPath(name: string, f: FileInfo = null){
        var p = name;

        if(f instanceof FileInfo) {
            p = path.join(f.path, p);
        }

        return p;
    }

    /**
     * Concatenates the contents of the specified files into one file
     * @param files
     * @param outFile
     */
    static concatenate(files: FileInfo[], outFile: string){
        for(var i in files){
            fs.appendFileSync(outFile, files[i].readAsString())
        }
    }

    /**
     * Creates the specified directory.
     * The parent directory may be specified.
     *
     * @param name
     * @param parentDirectory
     */
    static createDirectory(name: string, parentDirectory: FileInfo = null): FileInfo{

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
    static exists(name: string, directory: FileInfo = null): boolean{
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
    static createFile(name: string, content: string, directory: FileInfo = null): FileInfo{

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
    static findFiles(directory: FileInfo, extension: string = null): FileInfo[]{

        var results: FileInfo[] = [];
        var files: FileInfo[] = directory.getFiles();

        for (var i = 0; i < files.length; i++) {

            var f: FileInfo = files[i];

            if(f.isDirectory) {
                results = results.concat(FileInfo.findFiles(f, extension));

            }else if(f.extensionCheck(extension)){
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
    static get cwd(): FileInfo{
        return new FileInfo(process.cwd());
    }

    //endregion

    /**
     * Creates the file
     *
     * @param path
     * @param base
     */
    constructor(path: string, base: FileInfo = null){

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
    private extensionCheck(extension: string): boolean{

        if('string' == typeof extension && extension.length > 0) {
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
    appendString(data: string){
        fs.appendFileSync(this.path, data);
    }

    /**
     * Copies the file to the specified destination folder
     *
     * @param destination
     */
    copy(destination: FileInfo, newName: string = null){

        if(this.isDirectory) {
            throw "Can't copy a folder";
        }

        var dest = path.join(destination.path, newName || this.name);

        var contents = fs.readFileSync(this.path);
        fs.writeFileSync(dest, contents);

    }

    /**
     * Gets the child files of the file, if its a directory.
     */
    getFiles(extension = null): FileInfo[]{

        if(!this.isDirectory) return [];

        var files: string[] = fs.readdirSync(this.path);
        var result: FileInfo[] = [];

        for (var i = 0; i < files.length; i++) {

            var f = new FileInfo(path.join(this.path, files[i]));
            if(f.extensionCheck(extension)) {
                result.push(f);
            }
        }

        return result;
    }

    /**
     * Reads the file as a String
     * @param encoding
     */
    readAsString(encoding: string = 'utf8'): string{
        return fs.readFileSync(this.path, {encoding: encoding});
    }

    /**
     * Reads the file and returns the JSON inside of it.
     * @param encoding
     * @returns {any}
     */
    readAsJSON(encoding: string = 'utf8'): any{
        return JSON.parse(this.readAsString(encoding));
    }

    /**
     * Deletes the file
     */
    unlink(){
        fs.unlinkSync(this.path);
    }

    /**
     * Writes the specified string as the data of the file
     * @param data
     * @param mode
     * @param flag
     */
    writeString(data: string, mode: number = 438, flag: string = 'w'){
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
    get accessed(): Date {
        return new Date(String(this.stats.atime));
    }

    /**
     * Gets the extension of the file, without the dot.
     *
     * @returns {string}
     */
    get extension():string {
        var index = this.path.lastIndexOf('.');

        if(index >= 0 && index < this.path.length) {
            return this.path.substr(index + 1);
        }else {
            return '';
        }
    }

    /**
     * Gets a value indicating if the file is a directory
     *
     * @returns {boolean}
     */
    get isDirectory():boolean {
        return this.stats.isDirectory();
    }

    /**
     * Gets the name of the file or directory
     *
     * @returns {string}
     */
    get name():string {
        return path.basename(this.path);
    }

    /**
     * Property field
     */
    private _path:string;

    /**
     * Gets the path of the file
     *
     * @returns {string}
     */
    get path():string {
        return this._path;
    }

    /**
     * Gets the size of the file in bytes
     *
     * @returns {number}
     */
    get size():number {
        return this.stats.size;
    }

    /**
     * Field for stats property
     */
    private _stats:fs.Stats;

    /**
     * Gets the stats
     *
     * @returns {Stats}
     */
    get stats():fs.Stats {
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
    get modified(): Date {
        return new Date(String(this.stats.mtime));
    }


    //endregion

}

/**
 * Represents a typescript file
 */
export class TsFileInfo extends FileInfo{

    //region Static

    //endregion

    //region Methods



    //endregion

    //region Properties

    /**
     * Field for classInfo property
     */
    private _classInfo:TsClassInfo;

    /**
     * Gets the class info of the file
     *
     * @returns {TsClassInfo}
     */
    get classInfo():TsClassInfo {
        if (!this._classInfo) {

            this._classInfo = {
                isClass: false,
                references: 0
            };

            // Read file
            var data = this.readAsString();

            // Get matches
            var matches = data.match(/export\s+class\s+(\w*)(\s+extends\s+([\w|\.]*))?/i);

            if(matches && matches.length > 1){
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
    get className():string {
        return this.classInfo.className || null;
    }

    /**
     * Gets a value indicating if the file contains a class
     *
     * @returns {boolean}
     */
    get isClass():boolean {
        return this.classInfo.isClass;
    }


    //endregion

}

/**
 * Represents a set of TsFile objects, and enables tsc compiling of them.
 */
export class TsFileInfoSet{

    //region Static

    /**
     * Creates a TS file set from the specified folder path
     *
     * @param path
     * @returns {TsFileInfoSet}
     */
    static byPath(path: string): TsFileInfoSet{
        return TsFileInfoSet.byFolder(new FileInfo(path));
    }

    /**
     * Creates a TS file set from the specified folder
     *
     * @param f
     * @returns {TsFileInfoSet}
     */
    static byFolder(f: FileInfo): TsFileInfoSet{

        var files: FileInfo[] = FileInfo.findFiles(f, 'ts');
        var ts: TsFileInfo[] = [];

        // Fill ts array
        for(var i in files)
            ts.push(new TsFileInfo(files[i].path));

        return new TsFileInfoSet(ts);
    }

    //endregion

    /**
     * Creates the set of TS files of the specified TsFileInfo objects
     * @param files //erase this
     */
    constructor(files: TsFileInfo[]){
        this._files = files;
    }

    //region Private Methods


    /**
     * Returns a value indicating if the specified base class extends the specified super class
     *
     * @param baseClass
     * @param superClass
     */
    private classExtends(baseClass: TsClassInfo, superClass: TsClassInfo): boolean{

        if(!baseClass) return false;

        if(baseClass.extendsClass == superClass.className) {
            return true;

        }else if('string' == baseClass.extendsClass){
            return this.classExtends(this.byClass(baseClass.className), superClass);

        }else {
            return false;
        }

    }

    /**
     * Finds the references between files, by updating classInfo.references
     */
    private updateReferences(){

        for (var i = 0; i < this.classFiles.length; i++) {
            for (var j = 0; j < this.classFiles.length; j++) {
                if(this.classExtends(this.classFiles[j].classInfo, this.classFiles[i].classInfo)){
                    this.classFiles[i].classInfo.references++;
                }
            }
        }

    }

    /**
     * Gets the class files sorted by its reference (Most referenced first)
     */
    private getClassFilesSortedByReference(): TsFileInfo[]{

        // Update References
        this.updateReferences();

        var r: TsFileInfo[] = [];

        // Initially fill result
        for (var i in this.classFiles) r.push(this.classFiles[i]);

        // Sort now
        r.sort((a: TsFileInfo, b: TsFileInfo) => {
            return b.classInfo.references - a.classInfo.references
        });

        return r;

    }

    /**
     * Gets the files in order to compile
     */
    private getFilesInCompileOrder(): TsFileInfo[]{

        var r: TsFileInfo[] = [];

        // Add non-class files
        for(var i in this.nonClassFiles)
            r.push(this.nonClassFiles[i]);

        // Get classes sorted by reference
        var sorted: TsFileInfo[] = this.getClassFilesSortedByReference();

        // Add sorted class files
        for(var i in sorted)
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
    byClass(className: string): TsFileInfo{

        for (var i = 0; i < this.classFiles.length; i++) {
            if(this.classFiles[i].className == className) {
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
    compile(options: TscOptions, callback: (error, stdout, stderr) => any){

        var sorted: TsFileInfo[] = this.getFilesInCompileOrder();
        var files: string[] = [];
        var actualOptions = [
            "--target ES5"
        ];

        // Module option
        if('string' == typeof options.module){
            actualOptions.push(sprintf('-m %s', options.module));
        }

        // Out file option
        if('string' == typeof options.file){
            actualOptions.push(sprintf("--out %s", options.file))
        }

        // Declaration
        if(options.declaration === true){
            actualOptions.push('-d')
        }

        // Remove comments
        if(options.removeComments === true){
            actualOptions.push('--removeComments')
        }

        // No implicit any
        if(options.noImplicitAny === true){
            actualOptions.push('--noImplicitAny')
        }

        // Gather files
        for(var i in sorted){
            files.push(sprintf('"%s"', sorted[i].path));
        }

        // Execute compile process
        child_process.exec(
            sprintf("tsc %s %s", actualOptions.join(' '), files.join(' ')),
            callback);

    }

    //endregion

    //region Properties

    /**
     * Field for classFiles property
     */
    private _classFiles:TsFileInfo[];

    /**
     * Gets the files who contains a class
     *
     * @returns {TsFileInfo[]}
     */
    get classFiles():TsFileInfo[] {
        if (!this._classFiles) {
            this._classFiles = [];

            for (var i = 0; i < this.files.length; i++) {
                if(this.files[i].isClass)
                    this._classFiles.push(this.files[i]);
            }

        }
        return this._classFiles;
    }

    /**
     * Property field
     */
    private _files:TsFileInfo[];

    /**
     * Gets the files of the set
     *
     * @returns {TsFileInfo[]}
     */
    get files():TsFileInfo[] {
        return this._files;
    }

    /**
     * Field for nonClassFiles property
     */
    private _nonClassFiles:TsFileInfo[];

    /**
     * Gets the files who are not a class
     *
     * @returns {TsFileInfo[]}
     */
    get nonClassFiles():TsFileInfo[] {
        if (!this._nonClassFiles) {
            this._nonClassFiles = [];

            for (var i = 0; i < this.files.length; i++) {
                if(!this.files[i].isClass)
                    this._nonClassFiles.push(this.files[i]);
            }

        }
        return this._nonClassFiles;
    }


    //endregion

}

export class PhpFileInfo extends FileInfo{

}

/**
 * Represents a set of php files in the latte project
 */
export class PhpFileInfoSet{

    //region Static
    /**
     * Creates the set from finding php files in the specified folder
     * @param folder
     * @returns {PhpFileInfoSet}
     */
    static fromFolder(folder: FileInfo): PhpFileInfoSet{
        let files = FileInfo.findFiles(folder, 'php');
        let r = [];

        files.forEach((f) => r.push(new PhpFileInfo(f.path)));

        return new PhpFileInfoSet(r);
    }
    //endregion

    constructor(files: PhpFileInfo[]){
        this._files = files;
    }

    //region Methods
    /**
     * Makes the latte release to the specified path
     * @param path
     */
    release(moduleName: string, out: FileInfo){

        let eventFiles = [];
        let outPath = PhpFileInfoSet.releasePath(moduleName, out);

        // if(FileInfo.exists(outPath)) {
        //     (new FileInfo(outPath)).writeString('');
        // }

        this.files.forEach((f: PhpFileInfo) => {
            if(f.name.indexOf('_') === 0) {
                eventFiles.push(f);
            }else {
                let contents = f.readAsString();
                if(contents.indexOf('<?') === 0) {
                    contents = contents.substr(contents.indexOf('\n') + 1);
                }
                fs.appendFileSync(outPath, contents);
            }
        });

        eventFiles.forEach((f: PhpFileInfo) => {
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
    static releasePath(moduleName: string, out: FileInfo): string{
        return FileInfo.joinPath(sprintf("%s.php", moduleName), out);
    }
    //endregion

    //region Properties
    /**
     * Property field
     */
    private _files: PhpFileInfo[];

    /**
     * Gets the files of the set
     *
     * @returns {PhpFileInfo[]}
     */
    get files(): PhpFileInfo[] {
        return this._files;
    }

    //endregion

}

// Get arguments
//var args = process.argv.slice(2);