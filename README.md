# xlatte
Node.js tool for compiling latte projects


#Install
`npm install -g xlatte`

#Use
You must use xlatte in the directory of the project, where the xlatte.json file lives.

`xlatte [module name]`

Example:
`xlatte mymodule`

mymodule must be a folder in the latte directory, and be composed of lang, php, ts, and view folders.


# Compile FileInfo.ts
```bash
cd src
tsc -t ES6 --module commonjs  FileInfo.ts
```