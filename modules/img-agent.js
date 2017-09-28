'use strict';
const fs = require('fs');
const path = require('path');
const IMG_PATH = `${process.cwd()}\\images`;

function formImgFilename(req, id) {
    return `${req.url.split("/")[ 1 ]}-${id}`;
}    

function saveImg(fileName, srcbase64) {
    let regExp = /^data:image\/([\w]+);(base64),/;
    let expMatch = srcbase64.match(regExp);
    let rawData = srcbase64.replace(regExp, "");
    let fileNameExt = `${fileName}.${expMatch[ 1 ]}`;
    let fullName = `${IMG_PATH}\\${fileNameExt}`;

    if (expMatch[ 2 ] !== 'base64') {
        return Promise.reject(new Error('Image must be a base64 string'));
    }

    return new Promise( (resolve,reject) => {
        fs.writeFile(fullName, rawData, 'base64', err => {
            if (err) {
                reject(err);
            }
            resolve(fileNameExt);
        });
    });
}

function removeImg(filename) {
    let fullName = `${IMG_PATH}\\${filename}`;

    if(fs.existsSync(fullName)) {
        fs.unlinkSync(fullName);
    }
}

module.exports = {
    saveImg,
    removeImg,
    formImgFilename
}
