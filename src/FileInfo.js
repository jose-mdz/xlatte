/// <reference path="node.d.ts" />
/// <reference path="cheerio.d.ts" />
/// <reference path="mysql.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var fs = require('fs');
var path = require('path');
var child_process = require('child_process');
/**
 * sprintf for only %s strings
 */
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
;
/**
 * Represents a file or a directory.
 * This class can only represent existing files.
 * To create files use static methods createFile and createDirectory.
 */
var FileInfo = (function () {
    //endregion
    /**
     * Creates the file
     *
     * @param path
     * @param base
     */
    function FileInfo(path, base) {
        if (base === void 0) { base = null; }
        // Set the real path
        this._path = fs.realpathSync(FileInfo.joinPath(path, base));
    }
    //region Static
    /**
     * Joins the given name and the path of the file, if any.
     * @param name
     * @param f
     * @returns {string}
     */
    FileInfo.joinPath = function (name, f) {
        if (f === void 0) { f = null; }
        var p = name;
        if (f instanceof FileInfo) {
            p = path.join(f.path, p);
        }
        return p;
    };
    /**
     * Creates the specified directory.
     * The parent directory may be specified.
     *
     * @param name
     * @param parentDirectory
     */
    FileInfo.createDirectory = function (name, parentDirectory) {
        if (parentDirectory === void 0) { parentDirectory = null; }
        // Get path
        var p = FileInfo.joinPath(name, parentDirectory);
        // Mk Dir
        fs.mkdirSync(p);
        // Return created directory
        return new FileInfo(p);
    };
    /**
     * Checks the specified file exists.
     *
     * @param path
     * @param base
     */
    FileInfo.exists = function (name, directory) {
        if (directory === void 0) { directory = null; }
        return fs.existsSync(FileInfo.joinPath(name, directory));
    };
    /**
     * Creates the specified file with the specified content.
     * The parent directory may be specified.
     *
     * @param name
     * @param content
     * @param directory
     */
    FileInfo.createFile = function (name, content, directory) {
        if (directory === void 0) { directory = null; }
        // Get path
        var p = FileInfo.joinPath(name, directory);
        // Write file
        fs.writeFileSync(p, content, {
            encoding: 'utf8'
        });
        // Return created file
        return new FileInfo(p);
    };
    /**
     * (Deeply) Finds files on the specified directory
     * @param directory
     * @param extension
     * @returns {FileInfo[]}
     */
    FileInfo.findFiles = function (directory, extension) {
        if (extension === void 0) { extension = null; }
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
    };
    Object.defineProperty(FileInfo, "cwd", {
        /**
         * Gets the current working directory
         *
         * @returns {FileInfo}
         */
        get: function () {
            return new FileInfo(process.cwd());
        },
        enumerable: true,
        configurable: true
    });
    //region Private Methods
    /**
     * Returns a value indicating if the file passes an extension check. If no value provided for extension, check
     * will be true
     * @param extension
     * @returns {boolean}
     */
    FileInfo.prototype.extensionCheck = function (extension) {
        if ('string' == typeof extension && extension.length > 0) {
            return this.extension.toLowerCase() == extension.toLowerCase();
        }
        return true;
    };
    //endregion
    //region Methods
    /**
     * Copies the file to the specified destination folder
     *
     * @param destination
     */
    FileInfo.prototype.copy = function (destination, newName) {
        if (newName === void 0) { newName = null; }
        if (this.isDirectory) {
            throw "Can't copy a folder";
        }
        var dest = path.join(destination.path, newName || this.name);
        var contents = fs.readFileSync(this.path);
        fs.writeFileSync(dest, contents);
    };
    /**
     * Gets the child files of the file, if its a directory.
     */
    FileInfo.prototype.getFiles = function (extension) {
        if (extension === void 0) { extension = null; }
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
    };
    /**
     * Reads the file as a String
     * @param encoding
     */
    FileInfo.prototype.readAsString = function (encoding) {
        if (encoding === void 0) { encoding = 'utf8'; }
        return fs.readFileSync(this.path, { encoding: encoding });
    };
    /**
     * Reads the file and returns the JSON inside of it.
     * @param encoding
     * @returns {any}
     */
    FileInfo.prototype.readAsJSON = function (encoding) {
        if (encoding === void 0) { encoding = 'utf8'; }
        return JSON.parse(this.readAsString(encoding));
    };
    /**
     * Deletes the file
     */
    FileInfo.prototype.unlink = function () {
        fs.unlink(this.path);
    };
    /**
     * Writes the specified string as the data of the file
     * @param data
     * @param mode
     * @param flag
     */
    FileInfo.prototype.writeString = function (data, mode, flag) {
        if (mode === void 0) { mode = 438; }
        if (flag === void 0) { flag = 'w'; }
        fs.writeFileSync(this.path, data, {
            encoding: 'utf8',
            mode: mode,
            flag: flag
        });
    };
    Object.defineProperty(FileInfo.prototype, "extension", {
        //endregion
        //region Properties
        /**
         * Gets the extension of the file, without the dot.
         *
         * @returns {string}
         */
        get: function () {
            var index = this.path.lastIndexOf('.');
            if (index >= 0 && index < this.path.length) {
                return this.path.substr(index + 1);
            }
            else {
                return '';
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FileInfo.prototype, "isDirectory", {
        /**
         * Gets a value indicating if the file is a directory
         *
         * @returns {boolean}
         */
        get: function () {
            return this.stats.isDirectory();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FileInfo.prototype, "name", {
        /**
         * Gets the name of the file or directory
         *
         * @returns {string}
         */
        get: function () {
            return path.basename(this.path);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FileInfo.prototype, "path", {
        /**
         * Gets the path of the file
         *
         * @returns {string}
         */
        get: function () {
            return this._path;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FileInfo.prototype, "size", {
        /**
         * Gets the size of the file in bytes
         *
         * @returns {number}
         */
        get: function () {
            return this.stats.size;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FileInfo.prototype, "stats", {
        /**
         * Gets the stats
         *
         * @returns {Stats}
         */
        get: function () {
            if (!this._stats) {
                this._stats = fs.statSync(this.path);
            }
            return this._stats;
        },
        enumerable: true,
        configurable: true
    });
    return FileInfo;
})();
exports.FileInfo = FileInfo;
/**
 * Represents a typescript file
 */
var TsFileInfo = (function (_super) {
    __extends(TsFileInfo, _super);
    function TsFileInfo() {
        _super.apply(this, arguments);
    }
    Object.defineProperty(TsFileInfo.prototype, "classInfo", {
        /**
         * Gets the class info of the file
         *
         * @returns {TsClassInfo}
         */
        get: function () {
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
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TsFileInfo.prototype, "className", {
        /**
         * Gets the name of the class in the file
         *
         * @returns {string}
         */
        get: function () {
            return this.classInfo.className || null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TsFileInfo.prototype, "isClass", {
        /**
         * Gets a value indicating if the file contains a class
         *
         * @returns {boolean}
         */
        get: function () {
            return this.classInfo.isClass;
        },
        enumerable: true,
        configurable: true
    });
    return TsFileInfo;
})(FileInfo);
exports.TsFileInfo = TsFileInfo;
/**
 * Represents a set of TsFile objects, and enables tsc compiling of them.
 */
var TsFileInfoSet = (function () {
    //endregion
    /**
     * Creates the set of TS files of the specified TsFileInfo objects
     * @param files //erase this
     */
    function TsFileInfoSet(files) {
        this._files = files;
    }
    //region Static
    /**
     * Creates a TS file set from the specified folder path
     *
     * @param path
     * @returns {TsFileInfoSet}
     */
    TsFileInfoSet.byPath = function (path) {
        return TsFileInfoSet.byFolder(new FileInfo(path));
    };
    /**
     * Creates a TS file set from the specified folder
     *
     * @param f
     * @returns {TsFileInfoSet}
     */
    TsFileInfoSet.byFolder = function (f) {
        var files = FileInfo.findFiles(f, 'ts');
        var ts = [];
        for (var i in files)
            ts.push(new TsFileInfo(files[i].path));
        return new TsFileInfoSet(ts);
    };
    //region Private Methods
    /**
     * Returns a value indicating if the specified base class extends the specified super class
     *
     * @param baseClass
     * @param superClass
     */
    TsFileInfoSet.prototype.classExtends = function (baseClass, superClass) {
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
    };
    /**
     * Finds the references between files, by updating classInfo.references
     */
    TsFileInfoSet.prototype.updateReferences = function () {
        for (var i = 0; i < this.classFiles.length; i++) {
            for (var j = 0; j < this.classFiles.length; j++) {
                if (this.classExtends(this.classFiles[j].classInfo, this.classFiles[i].classInfo)) {
                    this.classFiles[i].classInfo.references++;
                }
            }
        }
    };
    /**
     * Gets the class files sorted by its reference (Most referenced first)
     */
    TsFileInfoSet.prototype.getClassFilesSortedByReference = function () {
        // Update References
        this.updateReferences();
        var r = [];
        for (var i in this.classFiles)
            r.push(this.classFiles[i]);
        // Sort now
        r.sort(function (a, b) {
            return b.classInfo.references - a.classInfo.references;
        });
        return r;
    };
    /**
     * Gets the files in order to compile
     */
    TsFileInfoSet.prototype.getFilesInCompileOrder = function () {
        var r = [];
        for (var i in this.nonClassFiles)
            r.push(this.nonClassFiles[i]);
        // Get classes sorted by reference
        var sorted = this.getClassFilesSortedByReference();
        for (var i in sorted)
            r.push(sorted[i]);
        return r;
    };
    //endregion
    //region Methods
    /**
     * Returns the file having the specified class. Null if not found.
     *
     * @param className
     */
    TsFileInfoSet.prototype.byClass = function (className) {
        for (var i = 0; i < this.classFiles.length; i++) {
            if (this.classFiles[i].className == className) {
                return this.classFiles[i];
            }
        }
        return null;
    };
    /**
     * Compiles the files on the set
     * @param options
     * @param callback
     */
    TsFileInfoSet.prototype.compile = function (options, callback) {
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
        for (var i in sorted) {
            files.push(sprintf('"%s"', sorted[i].path));
        }
        // Execute compile process
        child_process.exec(sprintf("tsc %s %s", actualOptions.join(' '), files.join(' ')), callback);
    };
    Object.defineProperty(TsFileInfoSet.prototype, "classFiles", {
        /**
         * Gets the files who contains a class
         *
         * @returns {TsFileInfo[]}
         */
        get: function () {
            if (!this._classFiles) {
                this._classFiles = [];
                for (var i = 0; i < this.files.length; i++) {
                    if (this.files[i].isClass)
                        this._classFiles.push(this.files[i]);
                }
            }
            return this._classFiles;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TsFileInfoSet.prototype, "files", {
        /**
         * Gets the files of the set
         *
         * @returns {TsFileInfo[]}
         */
        get: function () {
            return this._files;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TsFileInfoSet.prototype, "nonClassFiles", {
        /**
         * Gets the files who are not a class
         *
         * @returns {TsFileInfo[]}
         */
        get: function () {
            if (!this._nonClassFiles) {
                this._nonClassFiles = [];
                for (var i = 0; i < this.files.length; i++) {
                    if (!this.files[i].isClass)
                        this._nonClassFiles.push(this.files[i]);
                }
            }
            return this._nonClassFiles;
        },
        enumerable: true,
        configurable: true
    });
    return TsFileInfoSet;
})();
exports.TsFileInfoSet = TsFileInfoSet;
