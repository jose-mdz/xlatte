/// <reference path="node.d.ts" />
/// <reference path="cheerio.d.ts" />
/// <reference path="mysql.d.ts" />
var io = require('./FileInfo');
var cheerio = require('cheerio');
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
 * Holds Data about a View Class
 */
var ViewClassInfo = (function () {
    /**
     * Creates the object
     * @param className
     * @param source
     */
    function ViewClassInfo(className, source) {
        this.className = className;
        this.source = source;
    }
    return ViewClassInfo;
})();
exports.ViewClassInfo = ViewClassInfo;
/**
 * Class responsible for extracting Views on HTML Files, using method extract.
 */
var ViewExtractor = (function () {
    function ViewExtractor() {
        //endregion
        //region Fields
        this.moduleBase = "module latte{\n%s\n}";
        this.classBase = "\texport class %s extends %s{\n\t\t%s\n\t}";
        this.staticClassBase = "\texport class %s{\n\t\t%s\n\t}";
        this.constructorBase = "constructor(){\n\t\t\tsuper(Element.outlet('[data-class=%s]'))\n\t\t}";
        this.propertyBase = "private _PROP:TYPE;\n\t\tget PROP():TYPE {\n\t\t\tif (!this._PROP) {\n\t\t\t\tthis._PROP = new TYPE(this.find('[data-property=PROP]'));\n\t\t\t}\n\t\t\treturn this._PROP;\n\t\t}";
        this.staticPropertyBase = "private static _PROP:TYPE;\n\t\tstatic get PROP():TYPE {\n\t\t\tif (!this._PROP) {\n\t\t\t\tthis._PROP = new TYPE(CLASS.getElement().find('[data-property=PROP]'));\n\t\t\t}\n\t\t\treturn this._PROP;\n\t\t}";
        this.staticElementProperty = "private static _PROP:TYPE;\n\t\tstatic getPROP():TYPE {\n\t\t\tif (!this._PROP) {\n\t\t\t\tthis._PROP = new TYPE(Element.find('[data-outlet=CLASS]'));\n\t\t\t}\n\t\t\treturn this._PROP;\n\t\t}";
        this.staticModelProperty = "private static _PROP:TYPE;\n\t\tstatic getPROP():TYPE {\n\t\t\tif (!this._PROP) {\n\t\t\t\tthis._PROP = new TYPE(Element.find('[data-class=CLASS]'));\n\t\t\t}\n\t\t\treturn this._PROP;\n\t\t}";
        this.typeMap = {
            img: "ImgElement",
            text: "Textbox",
            password: "Textbox",
            checkbox: "Checkbox"
        };
        this.nativeTypeMap = {
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
    }
    Object.defineProperty(ViewExtractor, "instance", {
        /**
         * Gets the instance of the class
         *
         * @returns {ViewExtractor}
         */
        get: function () {
            if (!this._instance) {
                this._instance = new ViewExtractor();
            }
            return this._instance;
        },
        enumerable: true,
        configurable: true
    });
    //endregion
    //region Private Methods
    /**
     * Makes the code for a property hosted on the specified element
     *
     * @param element
     * @param outletName
     * @returns {*}
     */
    ViewExtractor.prototype.codeProperty = function (element, outletName) {
        var name = this.$(element).attr('data-property');
        var code = outletName ? this.staticPropertyBase : this.propertyBase;
        var type = this.determineElementType(element);
        // Property name
        code = code.replace(/PROP/g, name);
        // Property type
        code = code.replace(/TYPE/g, type);
        // Class name (for static outlets)
        if (outletName) {
            code = code.replace(/CLASS/g, outletName);
        }
        return code;
    };
    /**
     * Makes the code for the "element" property on a static outlet class
     * @param element
     * @param outletName
     * @returns {*}
     */
    ViewExtractor.prototype.codeStaticElementProperty = function (element, outletName) {
        var code = this.staticElementProperty;
        // Property type
        code = code.replace(/TYPE/g, this.determineElementType(element));
        // Property name
        code = code.replace(/PROP/g, "Element");
        // Class name (for static outlets)
        code = code.replace(/CLASS/g, outletName);
        return code;
    };
    /**
     * Makes the code for the "model" property on a static outlet instatiable class
     * @param element
     * @param outletName
     * @returns {*}
     */
    ViewExtractor.prototype.codeStaticModelProperty = function (element, outletName) {
        var code = this.staticModelProperty;
        // Property type
        code = code.replace(/TYPE/g, this.determineElementType(element));
        // Property name
        code = code.replace(/PROP/g, "Model");
        // Class name (for static outlets)
        code = code.replace(/CLASS/g, outletName);
        return code;
    };
    /**
     * Collects the properties inside the specified node
     * @param c
     * @param outletName
     * @returns {Array}
     */
    ViewExtractor.prototype.collectProperties = function (c, outletName) {
        var _this = this;
        var members = [];
        c.find('[data-property]').each(function (i, element) {
            members.push(_this.codeProperty(element, outletName));
        });
        members.sort();
        return members;
    };
    /**
     * Determines the latte type for the specified tag
     * @param element
     * @returns {string}
     */
    ViewExtractor.prototype.determineElementType = function (element) {
        var type = "Element";
        //region Decide type
        var generic = "<HTMLElement>";
        var checker = element.tagName.toLowerCase();
        if ('string' == typeof this.nativeTypeMap[checker])
            generic = sprintf("<%s>", this.nativeTypeMap[checker]);
        if (checker == 'input')
            checker = this.$(element).attr('type') || 'text';
        if ('string' == typeof this.typeMap[checker]) {
            generic = '';
            type = this.typeMap[checker];
        }
        type = type + generic;
        //endregion
        return type;
    };
    //endregion
    //region Methods
    /**
     * Extracts the views of the specified file
     * @param file
     */
    ViewExtractor.prototype.extract = function (file) {
        var result = [];
        var html = file.readAsString();
        var $ = this.$ = cheerio.load(html);
        var classes = $('*[data-class]');
        var outlets = $('*[data-outlet]');
        for (var i = 0; i < classes.length; i++) {
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
        for (var i = 0; i < outlets.length; i++) {
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
    };
    /**
     * Extracts view classes from the specified folder
     * @param folder
     * @returns {ViewClassInfo[]}
     */
    ViewExtractor.prototype.extractFolder = function (folder) {
        var result = [];
        var files = io.FileInfo.findFiles(folder, 'html');
        for (var i = 0; i < files.length; i++) {
            result = result.concat(this.extract(files[i]));
        }
        return result;
    };
    return ViewExtractor;
})();
exports.ViewExtractor = ViewExtractor;
