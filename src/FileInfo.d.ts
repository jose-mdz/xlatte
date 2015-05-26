/// <reference path="node.d.ts" />
/// <reference path="cheerio.d.ts" />
/// <reference path="mysql.d.ts" />
import fs = require('fs');
/**
 * Represents a TypeScript code file
 */
export interface TsClassInfo {
    isClass: boolean;
    className?: string;
    extendsClass?: string;
    references?: number;
}
/**
 * Options for compiling TypeScript
 */
export interface TscOptions {
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
export declare class FileInfo {
    /**
     * Joins the given name and the path of the file, if any.
     * @param name
     * @param f
     * @returns {string}
     */
    private static joinPath(name, f?);
    /**
     * Creates the specified directory.
     * The parent directory may be specified.
     *
     * @param name
     * @param parentDirectory
     */
    static createDirectory(name: string, parentDirectory?: FileInfo): FileInfo;
    /**
     * Checks the specified file exists.
     *
     * @param path
     * @param base
     */
    static exists(name: string, directory?: FileInfo): boolean;
    /**
     * Creates the specified file with the specified content.
     * The parent directory may be specified.
     *
     * @param name
     * @param content
     * @param directory
     */
    static createFile(name: string, content: string, directory?: FileInfo): FileInfo;
    /**
     * (Deeply) Finds files on the specified directory
     * @param directory
     * @param extension
     * @returns {FileInfo[]}
     */
    static findFiles(directory: FileInfo, extension?: string): FileInfo[];
    /**
     * Gets the current working directory
     *
     * @returns {FileInfo}
     */
    static cwd: FileInfo;
    /**
     * Creates the file
     *
     * @param path
     * @param base
     */
    constructor(path: string, base?: FileInfo);
    /**
     * Returns a value indicating if the file passes an extension check. If no value provided for extension, check
     * will be true
     * @param extension
     * @returns {boolean}
     */
    private extensionCheck(extension);
    /**
     * Copies the file to the specified destination folder
     *
     * @param destination
     */
    copy(destination: FileInfo, newName?: string): void;
    /**
     * Gets the child files of the file, if its a directory.
     */
    getFiles(extension?: any): FileInfo[];
    /**
     * Reads the file as a String
     * @param encoding
     */
    readAsString(encoding?: string): string;
    /**
     * Reads the file and returns the JSON inside of it.
     * @param encoding
     * @returns {any}
     */
    readAsJSON(encoding?: string): any;
    /**
     * Deletes the file
     */
    unlink(): void;
    /**
     * Writes the specified string as the data of the file
     * @param data
     * @param mode
     * @param flag
     */
    writeString(data: string, mode?: number, flag?: string): void;
    /**
     * Gets the extension of the file, without the dot.
     *
     * @returns {string}
     */
    extension: string;
    /**
     * Gets a value indicating if the file is a directory
     *
     * @returns {boolean}
     */
    isDirectory: boolean;
    /**
     * Gets the name of the file or directory
     *
     * @returns {string}
     */
    name: string;
    /**
     * Property field
     */
    private _path;
    /**
     * Gets the path of the file
     *
     * @returns {string}
     */
    path: string;
    /**
     * Gets the size of the file in bytes
     *
     * @returns {number}
     */
    size: number;
    /**
     * Field for stats property
     */
    private _stats;
    /**
     * Gets the stats
     *
     * @returns {Stats}
     */
    stats: fs.Stats;
}
/**
 * Represents a typescript file
 */
export declare class TsFileInfo extends FileInfo {
    /**
     * Field for classInfo property
     */
    private _classInfo;
    /**
     * Gets the class info of the file
     *
     * @returns {TsClassInfo}
     */
    classInfo: TsClassInfo;
    /**
     * Gets the name of the class in the file
     *
     * @returns {string}
     */
    className: string;
    /**
     * Gets a value indicating if the file contains a class
     *
     * @returns {boolean}
     */
    isClass: boolean;
}
/**
 * Represents a set of TsFile objects, and enables tsc compiling of them.
 */
export declare class TsFileInfoSet {
    /**
     * Creates a TS file set from the specified folder path
     *
     * @param path
     * @returns {TsFileInfoSet}
     */
    static byPath(path: string): TsFileInfoSet;
    /**
     * Creates a TS file set from the specified folder
     *
     * @param f
     * @returns {TsFileInfoSet}
     */
    static byFolder(f: FileInfo): TsFileInfoSet;
    /**
     * Creates the set of TS files of the specified TsFileInfo objects
     * @param files //erase this
     */
    constructor(files: TsFileInfo[]);
    /**
     * Returns a value indicating if the specified base class extends the specified super class
     *
     * @param baseClass
     * @param superClass
     */
    private classExtends(baseClass, superClass);
    /**
     * Finds the references between files, by updating classInfo.references
     */
    private updateReferences();
    /**
     * Gets the class files sorted by its reference (Most referenced first)
     */
    private getClassFilesSortedByReference();
    /**
     * Gets the files in order to compile
     */
    private getFilesInCompileOrder();
    /**
     * Returns the file having the specified class. Null if not found.
     *
     * @param className
     */
    byClass(className: string): TsFileInfo;
    /**
     * Compiles the files on the set
     * @param options
     * @param callback
     */
    compile(options: TscOptions, callback: (error: any, stdout: any, stderr: any) => any): void;
    /**
     * Field for classFiles property
     */
    private _classFiles;
    /**
     * Gets the files who contains a class
     *
     * @returns {TsFileInfo[]}
     */
    classFiles: TsFileInfo[];
    /**
     * Property field
     */
    private _files;
    /**
     * Gets the files of the set
     *
     * @returns {TsFileInfo[]}
     */
    files: TsFileInfo[];
    /**
     * Field for nonClassFiles property
     */
    private _nonClassFiles;
    /**
     * Gets the files who are not a class
     *
     * @returns {TsFileInfo[]}
     */
    nonClassFiles: TsFileInfo[];
}
