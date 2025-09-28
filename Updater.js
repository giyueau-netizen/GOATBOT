const axios = require('axios');
const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const log = require('./logger/log.js');
let chalk;
try {
        chalk = require("./func/colors.js").colors;
}
catch (e) {
        chalk = require("chalk");
}

const sep = path.sep;
const currentConfig = require('./config.json');
const langCode = currentConfig.language;
const execSync = require('child_process').execSync;

let pathLanguageFile = `${process.cwd()}/languages/${langCode}.lang`;
if (!fs.existsSync(pathLanguageFile)) {
        log.warn("LANGUAGE", `Can't find language file ${langCode}, using default language file "${path.normalize(`${process.cwd()}/languages/en.lang`)}"`);
        pathLanguageFile = `${process.cwd()}/languages/en.lang`;
}
const readLanguage = fs.readFileSync(pathLanguageFile, "utf-8");
const languageData = readLanguage
        .split(/\r?\n|\r/)
        .filter(line => line && !line.trim().startsWith("#") && !line.trim().startsWith("//") && line != "");

global.language = {};
for (const sentence of languageData) {
        const getSeparator = sentence.indexOf('=');
        const itemKey = sentence.slice(0, getSeparator).trim();
        const itemValue = sentence.slice(getSeparator + 1, sentence.length).trim();
        const head = itemKey.slice(0, itemKey.indexOf('.'));
        const key = itemKey.replace(head + '.', '');
        const value = itemValue.replace(/\\n/gi, '\n');
        if (!global.language[head])
                global.language[head] = {};
        global.language[head][key] = value;
}

function getText(head, key, ...args) {
        if (!global.language[head]?.[key])
                return `Can't find text: "${head}.${key}"`;
        let text = global.language[head][key];
        for (let i = args.length - 1; i >= 0; i--)
                text = text.replace(new RegExp(`%${i + 1}`, 'g'), args[i]);
        return text;
}

const defaultWriteFileSync = fs.writeFileSync;
const defaulCopyFileSync = fs.copyFileSync;

function checkAndAutoCreateFolder(pathFolder) {
        const splitPath = path.normalize(pathFolder).split(sep);
        let currentPath = '';
        for (const i in splitPath) {
                currentPath += splitPath[i] + sep;
                if (!fs.existsSync(currentPath))
                        fs.mkdirSync(currentPath);
        }
}

function sortObj(obj, parentObj, rootKeys, stringKey = "") {
        const root = sortObjAsRoot(obj, rootKeys);
        stringKey = stringKey || "";
        if (stringKey) {
                stringKey += ".";
        }
        for (const key in root) {
                if (
                        typeof root[key] == "object"
                        && !Array.isArray(root[key])
                        && root[key] != null
                ) {
                        stringKey += key;

                        root[key] = sortObj(
                                root[key],
                                parentObj,
                                Object.keys(_.get(parentObj, stringKey) || {}),
                                stringKey
                        );

                        stringKey = "";
                }
        }
        return root;
}

function sortObjAsRoot(subObj, rootKeys) {
        const _obj = {};
        for (const key in subObj) {
                const indexInRootObj = rootKeys.indexOf(key);
                _obj[key] = indexInRootObj == -1 ? 9999 : indexInRootObj;
        }
        const sortedSubObjKeys = Object.keys(_obj).sort((a, b) => _obj[a] - _obj[b]);
        const sortedSubObj = {};
        for (const key of sortedSubObjKeys) {
                sortedSubObj[key] = subObj[key];
        }

        return sortedSubObj;
}

// override fs.writeFileSync and fs.copyFileSync to auto create folder if not exist
fs.writeFileSync = function (fullPath, data) {
        fullPath = path.normalize(fullPath);
        const pathFolder = fullPath.split(sep);
        if (pathFolder.length > 1)
                pathFolder.pop();
        checkAndAutoCreateFolder(pathFolder.join(path.sep));
        defaultWriteFileSync(fullPath, data);
};

fs.copyFileSync = function (src, dest) {
        src = path.normalize(src);
        dest = path.normalize(dest);
        const pathFolder = dest.split(sep);
        if (pathFolder.length > 1)
                pathFolder.pop();
        checkAndAutoCreateFolder(pathFolder.join(path.sep));
        defaulCopyFileSync(src, dest);
};

(async () => {
        const { data: lastCommit } = await axios.get('https://api.github.com/repos/ntkhang03/Goat-Bot-V2/commits/main');
        const lastCommitDate = new Date(lastCommit.commit.committer.date);
        // if < 5min then stop update and show message
        if (new Date().getTime() - lastCommitDate.getTime() < 5 * 60 * 1000) {
                const minutes = Math.floor((5 * 60 * 1000 - (new Date().getTime() - lastCommitDate.getTime())) / 1000 / 60);
                const seconds = Math.floor((5 * 60 * 1000 - (new Date().getTi
