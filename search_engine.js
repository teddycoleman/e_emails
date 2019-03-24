const _ = require('lodash');
const async = require('async');
const fs = require('fs');

const ROOT_DIR = './maildir/skilling-j/';
const CONTENT_INDEX_LOCATION = './content_index.json';
const IDS_TO_FILE_LOCATION = './ids_to_file_index.json';

class SearchEngine {
    constructor(shouldReload = false) {
        this.contentIndex = {};
        this.idToFileIndex = {};
        if (shouldReload) {
            this._loadFilesToIndex(ROOT_DIR);
            this._dumpIndicesToFile();
        } else {
            this._loadIndicesFromFile();
        }
    }

    search(inputStr) {
        if (!_.isString(inputStr)) {
            return 'Invalid input, please give a string'; // yes, this should also handle converting numbers to strings properly
        }
        const allRelevantKeys = this._findAllRelevantKeysForString(inputStr);
        const emailIds = this._findAllRelevantEmailIdsForKeys(allRelevantKeys);
        const emailLocations = this._findAllRelevantLocationsForIds(emailIds);

        if (_.isEmpty(emailLocations)) {
            console.log('Could not match search');
            return [];
        }

        console.log('terms that match your search: ', allRelevantKeys);
        console.log('email locations that match your search: ', emailLocations);
        return emailLocations;
    }

    _findAllRelevantKeysForString(inputStr) {
        const regexp = new RegExp(`^${inputStr}`, 'i');
        const allRelevantKeys = _.chain(this.contentIndex)
            .keys()
            .filter((key) => {
                return regexp.test(key);
            })
            .value();
        return allRelevantKeys;
    }

    _findAllRelevantEmailIdsForKeys(allRelevantKeys) {
        return _.chain(allRelevantKeys)
            .map((key) => {
                return this.contentIndex[key];
            })
            .flatten()
            .value();
    }

    _findAllRelevantLocationsForIds(emailIds) {
        return _.chain(emailIds)
            .map((emailId) => {
                return this.idToFileIndex[emailId];
            })
            .flatten()
            .uniq()
            .value();
    }

    _loadFilesToIndex(directory) {
        const directoryList = fs.readdirSync(directory);
        _.each(directoryList, (listItem) => {
            const fileOrDirectoryToLoad = `${directory}${listItem}`;
            const fileStats = fs.statSync(fileOrDirectoryToLoad);
            if (fileStats && fileStats.isDirectory()) {
                this._loadFilesToIndex(`${fileOrDirectoryToLoad}/`);
            } else {
                try {
                    const content = fs.readFileSync(fileOrDirectoryToLoad, 'utf-8'); 
                    this._addEmailDataToIndices(content, fileOrDirectoryToLoad);
                } catch (err) {
                    console.error(err);
                    // swallow error for now, would handle with more time
                }
            }
        });
    }

    _addEmailDataToIndices(emailData, fileLocation) {
        const emailByLine = emailData.split('\n');
        const messageId = this._getMessageId(emailByLine);

        if (!messageId || _.isEmpty(emailByLine)) {
            return;
        }

        this._addEmailToLocationIndex(messageId, fileLocation);

        const emailContent = emailData.split('\n\n')
            .slice(1)
            .join('\n');
        const cleanedText = emailContent
            .replace(/(\r\n|\n|\r|\t|\s+)/gm, " ")
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
        const cleanedTextArray = cleanedText.split(' ');

        _.chain(cleanedTextArray)
            .uniq()
            .compact()
            .each((word) => {
                const lowercaseWord = word.toLowerCase();
                const previousEntriesForWord = this.contentIndex[lowercaseWord];
                if (!previousEntriesForWord) {
                    this.contentIndex[lowercaseWord] = [messageId];
                } else if (!_.includes(previousEntriesForWord, messageId)) {
                    this.contentIndex[lowercaseWord].push(messageId);
                }
            })
            .value();
    }

    _getMessageId(emailByLine) {
        const messageIdRegex = new RegExp('^Message-ID', 'g');
        const messageIdMatch = _.chain(emailByLine)
            .map((line) => {
                return messageIdRegex.exec(line); 
            })
            .first()
            .value();
        const messageId = _.get(messageIdMatch, 'input', '')
            .replace(/^.+</,'')
            .replace(/\.JavaMail.*/,'')
            .trim();
        
        return messageId;
    }

    _addEmailToLocationIndex(messageId, fileLocation) {
        this.idToFileIndex[messageId] = fileLocation;
    }

    _dumpIndicesToFile() {
        async.parallel({
            writeContentIndex: (next) => {
                console.log('starting to write file');
                this._writeOneFile(CONTENT_INDEX_LOCATION, this.contentIndex, next);
            },

            writeIdToFileIndex: (next) => {
                this._writeOneFile(IDS_TO_FILE_LOCATION, this.idToFileIndex, next);
            },
        }, (err) => {
            if (err) {
                console.error(err);
            }
        });
    }

    _writeOneFile(destination, object, callback) {
        fs.writeFile(destination, JSON.stringify(object), (err) => {
            if (err) {
                console.error(err);
            } else {
                console.log(`successfully wrote file ${destination}`);
            }
            callback();
        });        
    }

    _loadIndicesFromFile() {
        const contentIndexString = fs.readFileSync(CONTENT_INDEX_LOCATION, {encoding: 'utf8'});
        this.contentIndex = JSON.parse(contentIndexString);

        const idsToFileLocationString = fs.readFileSync(IDS_TO_FILE_LOCATION, {encoding: 'utf8'});
        this.idToFileIndex = JSON.parse(idsToFileLocationString);
    }
}

module.exports = SearchEngine;
