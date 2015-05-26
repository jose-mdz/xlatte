/// <reference path="node.d.ts" />
/// <reference path="cheerio.d.ts" />
/// <reference path="mysql.d.ts" />
import io = require('./FileInfo');
/**
 * Holds Data about a View Class
 */
export declare class ViewClassInfo {
    className: string;
    source: string;
    /**
     * Creates the object
     * @param className
     * @param source
     */
    constructor(className: string, source: string);
}
/**
 * Class responsible for extracting Views on HTML Files, using method extract.
 */
export declare class ViewExtractor {
    /**
     * Field for instance property
     */
    private static _instance;
    /**
     * Gets the instance of the class
     *
     * @returns {ViewExtractor}
     */
    static instance: ViewExtractor;
    private moduleBase;
    private classBase;
    private staticClassBase;
    private constructorBase;
    private propertyBase;
    private staticPropertyBase;
    private staticElementProperty;
    private staticModelProperty;
    private typeMap;
    private nativeTypeMap;
    private $;
    /**
     * Makes the code for a property hosted on the specified element
     *
     * @param element
     * @param outletName
     * @returns {*}
     */
    private codeProperty(element, outletName);
    /**
     * Makes the code for the "element" property on a static outlet class
     * @param element
     * @param outletName
     * @returns {*}
     */
    private codeStaticElementProperty(element, outletName);
    /**
     * Makes the code for the "model" property on a static outlet instatiable class
     * @param element
     * @param outletName
     * @returns {*}
     */
    private codeStaticModelProperty(element, outletName);
    /**
     * Collects the properties inside the specified node
     * @param c
     * @param outletName
     * @returns {Array}
     */
    private collectProperties(c, outletName);
    /**
     * Determines the latte type for the specified tag
     * @param element
     * @returns {string}
     */
    private determineElementType(element);
    /**
     * Extracts the views of the specified file
     * @param file
     */
    extract(file: io.FileInfo): ViewClassInfo[];
    /**
     * Extracts view classes from the specified folder
     * @param folder
     * @returns {ViewClassInfo[]}
     */
    extractFolder(folder: io.FileInfo): ViewClassInfo[];
}
