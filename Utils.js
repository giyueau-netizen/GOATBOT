const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const cheerio = require("cheerio");
const https = require("https");
const agent = new https.Agent({
        rejectUnauthorized: false
});
const moment = require("moment-timezone");
const mimeDB = require("mime-db");
const _ = require("lodash");
const { google } = require("googleapis");
const ora = require("ora");
const log = require("./logger/log.js");
const { isHexColor, colors } = require("./func/colors.js");
const Prism = require("./func/prism.js");

const { config } = global.GoatBot;
const { gmailAccount } = config.credentials;
const { clientId, clientSecret, refreshToken, apiKey: googleApiKey } = gmailAccount;
if (!clientId) {
        log.err("CREDENTIALS", `Please provide a valid clientId in file ${path.normalize(global.client.dirConfig)}`);
        process.exit();
}
if (!clientSecret) {
        log.err("CREDENTIALS", `Please provide a valid clientSecret in file ${path.normalize(global.client.dirConfig)}`);
        process.exit();
}
if (!refreshToken) {
        log.err("CREDENTIALS", `Please provide a valid refreshToken in file ${path.normalize(global.client.dirConfig)}`);
        process.exit();
}

const oauth2ClientForGGDrive = new google.auth.OAuth2(clientId, clientSecret, "https://developers.google.com/oauthplayground");
oauth2ClientForGGDrive.setCredentials({ refresh_token: refreshToken });
const driveApi = google.drive({
        version: 'v3',
        auth: oauth2ClientForGGDrive
});
const word = [
        'A', 'Á', 'À', 'Ả', 'Ã', 'Ạ', 'a', 'á', 'à', 'ả', 'ã', 'ạ',
        'Ă', 'Ắ', 'Ằ', 'Ẳ', 'Ẵ', 'Ặ', 'ă', 'ắ', 'ằ', 'ẳ', 'ẵ', 'ặ',
        'Â', 'Ấ', 'Ầ', 'Ẩ', 'Ẫ', 'Ậ', 'â', 'ấ', 'ầ', 'ẩ', 'ẫ', 'ậ',
        'B', 'b',
        'C', 'c',
        'D', 'Đ', 'd', 'đ',
        'E', 'É', 'È', 'Ẻ', 'Ẽ', 'Ẹ', 'e', 'é', 'è', 'ẻ', 'ẽ', 'ẹ',
        'Ê', 'Ế', 'Ề', 'Ể', 'Ễ', 'Ệ', 'ê', 'ế', 'ề', 'ể', 'ễ', 'ệ',
        'F', 'f',
        'G', 'g',
        'H', 'h',
        'I', 'Í', 'Ì', 'Ỉ', 'Ĩ', 'Ị', 'i', 'í', 'ì', 'ỉ', 'ĩ', 'ị',
        'J', 'j',
        'K', 'k',
        'L', 'l',
        'M', 'm',
        'N', 'n',
        'O', 'Ó', 'Ò', 'Ỏ', 'Õ', 'Ọ', 'o', 'ó', 'ò', 'ỏ', 'õ', 'ọ',
        'Ô', 'Ố', 'Ồ', 'Ổ', 'Ỗ', 'Ộ', 'ô', 'ố', 'ồ', 'ổ', 'ỗ', 'ộ',
        'Ơ', 'Ớ', 'Ờ', 'Ở', 'Ỡ', 'Ợ', 'ơ', 'ớ', 'ờ', 'ở', 'ỡ', 'ợ',
        'P', 'p',
        'Q', 'q',
        'R', 'r',
        'S', 's',
        'T', 't',
        'U', 'Ú', 'Ù', 'Ủ', 'Ũ', 'Ụ', 'u', 'ú', 'ù', 'ủ', 'ũ', 'ụ',
        'Ư', 'Ứ', 'Ừ', 'Ử', 'Ữ', 'Ự', 'ư', 'ứ', 'ừ', 'ử', 'ữ', 'ự',
        'V', 'v',
        'W', 'w',
        'X', 'x',
        'Y', 'Ý', 'Ỳ', 'Ỷ', 'Ỹ', 'Ỵ', 'y', 'ý', 'ỳ', 'ỷ', 'ỹ', 'ỵ',
        'Z', 'z',
        ' '
];

const regCheckURL = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

class CustomError extends Error {
        constructor(obj) {
                if (typeof obj === 'string')
                        obj = { message: obj };
                if (typeof obj !== 'object' || obj === null)
                        throw new TypeError('Object required');
                obj.message ? super(obj.message) : super();
                Object.assign(this, obj);
        }
}

function lengthWhiteSpacesEndLine(text) {
        let length = 0;
        for (let i = text.length - 1; i >= 0; i--) {
                if (text[i] == ' ')
                        length++;
                else
                        break;
        }
        return length;
}

function lengthWhiteSpacesStartLine(text) {
        let length = 0;
        for (let i = 0; i < text.length; i++) {
                if (text[i] == ' ')
                        length++;
                else
                        break;
        }
        return length;
}

function setErrorUptime() {
        global.statusAccountBot = 'block spam';
        global.responseUptimeCurrent = global.responseUptimeError;
}
const defaultStderrClearLine = process.stderr.clearLine;


function convertTime(miliSeconds, replaceSeconds = "s", replaceMinutes = "m", replaceHours = "h", replaceDays = "d", replaceMonths = "M", replaceYears = "y", notShowZero = false) {
        if (typeof replaceSeconds == 'boolean') {
                notShowZero = replaceSeconds;
                replaceSeconds = "s";
        }
        const second = Math.floor(miliSeconds / 1000 % 60);
        const minute = Math.floor(miliSeconds / 1000 / 60 % 60);
        const hour = Math.floor(miliSeconds / 1000 / 60 / 60 % 24);
        const day = Math.floor(miliSeconds / 1000 / 60 / 60 / 24 % 30);
        const month = Math.floor(miliSeconds / 1000 / 60 / 60 / 24 / 30 % 12);
        const year = Math.floor(miliSeconds / 1000 / 60 / 60 / 24 / 30 / 12);
        let formattedDate = '';

        const dateParts = [
                { value: year, replace: replaceYears },
                { value: month, replace: replaceMonths },
                { value: day, replace: replaceDays },
                { v
