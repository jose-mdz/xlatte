/// <reference path="node.d.ts" />

import fs               = require('fs');
import path             = require('path');
import child_process    = require('child_process');
import cheerio          = require('cheerio');
import mysql            = require('mysql');

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
};

/**
 * Represents a TypeScript code file
 */
interface TsClassInfo{
    isClass: boolean;
    className?: string;
    extendsClass?: string;
    references?: number
}

/**
 * Options for compiling TypeScript
 */
interface TscOptions{
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
     * @returns {string}
     */
    private static joinPath(name: string, f: FileInfo = null){
        var p = name;

        if(f instanceof FileInfo) {
            p = path.join(f.path, p);
        }

        return p;
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
        fs.unlink(this.path);
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

/**
 * Holds Data about a View Class
 */
export class ViewClassInfo{

    /**
     * Creates the object
     * @param className
     * @param source
     */
    constructor(public className: string, public source: string);
}

/**
 * Class responsible for extracting Views on HTML Files, using method extract.
 */
export class ViewExtractor{

    //region Static
    /**
     * Field for instance property
     */
    private static _instance:ViewExtractor;

    /**
     * Gets the instance of the class
     *
     * @returns {ViewExtractor}
     */
    static get instance():ViewExtractor {
        if (!this._instance) {
            this._instance = new ViewExtractor();
        }
        return this._instance;
    }

    //endregion

    //region Fields

    private moduleBase = "module latte{\n%s\n}";
    private classBase = "\texport class %s extends %s{\n\t\t%s\n\t}";
    private staticClassBase = "\texport class %s{\n\t\t%s\n\t}";
    private constructorBase = "constructor(){\n\t\t\tsuper(Element.outlet('[data-class=%s]'))\n\t\t}";
    private propertyBase = "private _PROP:TYPE;\n\t\tget PROP():TYPE {\n\t\t\tif (!this._PROP) {\n\t\t\t\tthis._PROP = new TYPE(this.find('[data-property=PROP]'));\n\t\t\t}\n\t\t\treturn this._PROP;\n\t\t}";
    private staticPropertyBase = "private static _PROP:TYPE;\n\t\tstatic get PROP():TYPE {\n\t\t\tif (!this._PROP) {\n\t\t\t\tthis._PROP = new TYPE(CLASS.getElement().find('[data-property=PROP]'));\n\t\t\t}\n\t\t\treturn this._PROP;\n\t\t}";
    private staticElementProperty = "private static _PROP:TYPE;\n\t\tstatic getPROP():TYPE {\n\t\t\tif (!this._PROP) {\n\t\t\t\tthis._PROP = new TYPE(Element.find('[data-outlet=CLASS]'));\n\t\t\t}\n\t\t\treturn this._PROP;\n\t\t}";
    private staticModelProperty = "private static _PROP:TYPE;\n\t\tstatic getPROP():TYPE {\n\t\t\tif (!this._PROP) {\n\t\t\t\tthis._PROP = new TYPE(Element.find('[data-class=CLASS]'));\n\t\t\t}\n\t\t\treturn this._PROP;\n\t\t}";

    private typeMap = {
        img: "ImgElement",
        text: "Textbox",
        password: "Textbox",
        checkbox: "Checkbox"
    };

    private nativeTypeMap = {
        "html": "HTMLHtmlElement",
        "head": "HTMLHeadElement",
        "link": "HTMLLinkElement",
        "title": "HTMLTitleElement",
        "meta": "HTMLMetaElement",
        "base": "HTMLBaseElement",
        "isindex": "HTMLIsIndexElement",
        "style": "HTMLStyleElement",
        "body": "HTMLBodyElement",
        "form": "HTMLFormElement",
        "select": "HTMLSelectElement",
        "optgroup": "HTMLOptGroupElement",
        "option": "HTMLOptionElement",
        "input": "HTMLInputElement",
        "textarea": "HTMLTextAreaElement",
        "button": "HTMLButtonElement",
        "label": "HTMLLabelElement",
        "fieldset": "HTMLFieldSetElement",
        "legent": "HTMLLegendElement",
        "ul": "HTMLUListElement",
        "ol": "HTMLOListElement",
        "dl": "HTMLDListElement",
        "dir": "HTMLDirectoryElement",
        "menu": "HTMLMenuElement",
        "li": "HTMLLIElement",
        "div": "HTMLDivElement",
        "p": "HTMLParagraphElement",
        "h1": "HTMLHeadingElement",
        "h2": "HTMLHeadingElement",
        "h3": "HTMLHeadingElement",
        "h4": "HTMLHeadingElement",
        "h5": "HTMLHeadingElement",
        "quote": "HTMLQuoteElement",
        "pre": "HTMLPreElement",
        "br": "HTMLBRElement",
        "basefont": "HTMLBaseFontElement",
        "font": "HTMLFontElement",
        "hr": "HTMLHRElement",
        "ins": "HTMLModElement",
        "del": "HTMLModElement",
        "a": "HTMLAnchorElement",
        "img": "HTMLImageElement",
        "object": "HTMLObjectElement",
        "param": "HTMLParamElement",
        "applet": "HTMLAppletElement",
        "map": "HTMLMapElement",
        "area": "HTMLAreaElement",
        "script": "HTMLScriptElement",
        "table": "HTMLTableElement",
        "caption": "HTMLTableCaptionElement",
        "col": "HTMLTableColElement",
        "thead": "HTMLTableSectionElement",
        "tfoot": "HTMLTableSectionElement",
        "tbody": "HTMLTableSectionElement",
        "tr": "HTMLTableRowElement",
        "th": "HTMLTableCellElement",
        "td": "HTMLTableCellElement",
        "frameset": "HTMLFrameSetElement",
        "frame": "HTMLFrameElement",
        "iframe": "HTMLIFrameElement",
        "span": "HTMLSpanElement"
    };

    private $: any;

    //endregion

    //region Private Methods

    /**
     * Makes the code for a property hosted on the specified element
     *
     * @param element
     * @param outletName
     * @returns {*}
     */
    private codeProperty(element, outletName){

        var name = this.$(element).attr('data-property');
        var code = outletName ? this.staticPropertyBase : this.propertyBase;
        var type = this.determineElementType(element);

        // Property name
        code = code.replace(/PROP/g, name);

        // Property type
        code = code.replace(/TYPE/g, type);

        // Class name (for static outlets)
        if(outletName){
            code = code.replace(/CLASS/g, outletName);
        }

        return code;
    }

    /**
     * Makes the code for the "element" property on a static outlet class
     * @param element
     * @param outletName
     * @returns {*}
     */
    private codeStaticElementProperty(element, outletName){

        var code = this.staticElementProperty;

        // Property type
        code = code.replace(/TYPE/g, this.determineElementType(element));

        // Property name
        code = code.replace(/PROP/g, "Element");

        // Class name (for static outlets)
        code = code.replace(/CLASS/g, outletName);

        return code;
    }

    /**
     * Makes the code for the "model" property on a static outlet instatiable class
     * @param element
     * @param outletName
     * @returns {*}
     */
    private codeStaticModelProperty(element, outletName){

        var code = this.staticModelProperty;

        // Property type
        code = code.replace(/TYPE/g, this.determineElementType(element));

        // Property name
        code = code.replace(/PROP/g, "Model");

        // Class name (for static outlets)
        code = code.replace(/CLASS/g, outletName);

        return code;
    }

    /**
     * Collects the properties inside the specified node
     * @param c
     * @param outletName
     * @returns {Array}
     */
    private collectProperties(c, outletName){
        var members = [];

        c.find('[data-property]').each(function(i, element){

            members.push(this.codeProperty(element, outletName));
        });

        members.sort();

        return members;
    }

    /**
     * Determines the latte type for the specified tag
     * @param element
     * @returns {string}
     */
    private determineElementType(element){
        var type = "Element";

        //region Decide type
        var generic = "<HTMLElement>";
        var checker = element.tagName.toLowerCase();

        if('string' == typeof this.nativeTypeMap[checker]) generic = sprintf("<%s>", this.nativeTypeMap[checker]);

        if(checker == 'input') checker = this.$(element).attr('type') || 'text';

        if('string' == typeof this.typeMap[checker]){
            generic = '';
            type = this.typeMap[checker];
        }

        type = type + generic;
        //endregion

        return type;
    }
    //endregion

    //region Methods

    /**
     * Extracts the views of the specified file
     * @param file
     */
    extract(file: FileInfo): ViewClassInfo[]{

        var result: ViewClassInfo[] = [];
        var html: string = file.readAsString();
        var $: any = this.$ = (<any>cheerio).load(html);

        var classes = $('*[data-class]');
        var outlets = $('*[data-outlet]');

        for(var i = 0; i < classes.length; i++){
            var c = classes.eq(i);
            var className = c.attr('data-class');
            var classType = this.determineElementType(c.get(0));

            // Remove sub classes
            c.find('*[data-class]').remove();

            //echo("Class " + (i + 1) + ": " + className);

            // Properties
            var members = this.collectProperties(c, false);

            // Model property
            members.push(this.codeStaticModelProperty(c.get(0), className));

            // Constructor
            members.push(sprintf(this.constructorBase, className));

            // Insert class
            var classCode = sprintf(this.classBase, className, classType, members.join('\n\n\t\t'));

            // Insert namespace
            var code = sprintf(this.moduleBase, classCode);

            // Add to result
            result.push(new ViewClassInfo(className, code));

        }

        for(var i = 0; i < outlets.length; i++){
            var c = outlets.eq(i);
            var className = c.attr('data-outlet');

            // Remove sub classes
            c.find('*[data-class]').remove();
            c.find('*[data-outlet]').remove();

            // Properties
            var members = this.collectProperties(c, className);

            // Model property
            members.push(this.codeStaticElementProperty(c.get(0), className));

            // Insert class
            var classCode = sprintf(this.staticClassBase, className, members.join('\n\n\t\t'));

            // Insert namespace
            var code = sprintf(this.moduleBase, classCode);

            // Add to result
            result.push(new ViewClassInfo(className, code));

        }

        return result;
    }

    //endregion

}

export interface ModuleManifest{

    connection?: {
        host?: string;
        user?: string;
        password?: string;
        database?: string;
        file?: string;
    };

    records?: string[];

    "ua-include-js": string[];
    "ua-include-css": string[];
    "release-export": string[];
}

export class LatteModule extends FileInfo{

    /**
     * Creates the module representation
     * @param name
     */
    constructor(path: string){
        super(path);

        if(!this.isDirectory || !path.indexOf('.module') != path.length - 7){
            throw "Module name must be a folder ending in .module"
        }
    }

    //region Methods

    exportFiles(destinationFolder: FileInfo){

        var files = [];
        var fileAggegators = "ua-include-js,ua-include-css,release-export".split(',');

        for (var i = 0; i < fileAggegators.length; i++) {

            var aggregator = fileAggegators[i];

            if(this.manifest[aggregator]) {
                files = files.concat(this.manifest[aggregator]);
            }

        }



    }

    /**
     * Queries database of module
     * @param sql
     * @param callback
     */
    query(sql: string, callback: (err?: string, rows?: any[], fields?: any[]) => void){

        var xdata = this.manifest.connection;

        if('string' == xdata.file) {
            xdata = (new FileInfo(xdata.file, this)).readAsJSON();
        }

        var x = mysql.createConnection();

        x.connect();

        x.query(sql, callback);

        x.end();

    }

    //endregion

    //region Properties

    /**
     * Gets a value indicating if the module has a connection
     *
     * @returns {boolean}
     */
    get hasConnection():boolean {
        return 'undefined' !== typeof this.manifest.connection;
    }


    /**
     * Gets the name of the module
     *
     * @returns {string}
     */
    get name():string {
        return path.basename(this.path, '.module');
    }

    /**
     * Field for manifest property
     */
    private _manifest:ModuleManifest;

    /**
     * Gets module manifest
     *
     * @returns {ModuleManifest}
     */
    get manifest():ModuleManifest {
        if (!this._manifest) {
            this._manifest = (new FileInfo("module.json", this).readAsJSON());
        }
        return this._manifest;
    }

    /**
     * Gets the records of the manifest
     *
     * @returns {string[]}
     */
    get records():string[] {
        return this.manifest.records || [];
    }


    //endregion

}

// Get arguments
var args = process.argv.slice(2);