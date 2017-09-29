/**
 * Copyright 2017 Tyler Eastman.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function (RED) {
    'use strict';

    const ftp = require('ftp');
    const fs = require('fs');
    const path = require('path');

    function FtpDownloadServer(n) {
        RED.nodes.createNode(this, n);
        const credentials = RED.nodes.getCredentials(n.id);
        this.options = {
            'host': n.host || 'localhost',
            'port': n.port || 21,
            'user': n.user || 'anonymous',
            'password': credentials.password || 'anonymous@',
            'connTimeout': n.connTimeout || 10000,
            'pasvTimeout': n.pasvTimeout || 10000,
            'keepalive': n.keepalive || 10000
        };
    }

    RED.nodes.registerType('ftp-download-server', FtpDownloadServer, {
        credentials: {
            password: {type: 'password'}
        }
    });

    function FtpDownloadNode(n) {
        RED.nodes.createNode(this, n);

        const conn = new ftp();
        const flow = this.context().flow;
        const global = this.context().global;
        const node = this;
        node.server = n.server;
        node.serverConfig = RED.nodes.getNode(node.server);
        node.files = n.files;
        node.destination = n.destination;
        node.filesType = n.filesType || "str";
        node.destinationType = n.destinationType || "str";

        let fileList = [];
        let destination = "";

        node.on('input', (msg) => {

            // Load the files list from the appropriate variable.
            try {
                switch (node.filesType) {
                    case 'msg':
                        fileList = msg[node.files];
                        break;
                    case 'flow':
                        fileList = flow.get(node.files);
                        break;
                    case 'global':
                        fileList = global.get(node.files);
                        break;
                    case 'json':
                        fileList = JSON.parse(node.files);
                        break;
                    default:
                        fileList = [node.files];
                }
                if (!Array.isArray(fileList)) {
                    node.error("Files field must be an array.", msg);
                    return;
                }
            }
            catch (err) {
                node.error("Could not load files variable, type: " + node.filesType + " location: " + node.files, msg);
                return;
            }

            // Load the destination from the appropriate variable.
            try {
                switch (node.destinationType) {
                    case 'msg':
                        destination = msg[node.destination];
                        break;
                    case 'flow':
                        destination = flow.get(node.destination);
                        break;
                    case 'global':
                        destination = global.get(node.destination);
                        break;
                    default:
                        destination = node.destination;
                }
            }
            catch (err) {
                node.error("Could not load destination variable, type: " + node.destinationType + " location: " + node.destination, msg);
                return;
            }

            // Assert we have access to write to the destination
            try {
                fs.accessSync(destination, fs.constants.W_OK);
            }
            catch (err) {
                node.error("Lacking permission to write files to " + destination, msg);
                return;
            }

            conn.on('ready', () => {
                let promise = Promise.resolve([]);

                // Download each file sequentially
                fileList.forEach((file) => {
                    promise = promise.then(download(file));
                });

                promise
                    .then((filePaths)=> {
                        msg.payload = filePaths;
                        node.send(msg);
                    })
                    .catch((err) => {
                        msg.payload = {
                            fileList: fileList,
                            destination: destination,
                            error: err
                        };
                        node.error("FTP download failed", msg);
                    })
            });

            function download(file) {
                return (filePaths) => new Promise((resolve, reject) => {
                    try {
                        conn.get(file, (err, stream) => {
                            try {
                                if (err)
                                    throw err;
                                let filePath = path.join(destination, path.basename(file));
                                filePaths.push(filePath);
                                stream.once('finish', () => resolve(filePaths));
                                stream.pipe(fs.createWriteStream(filePath));
                            }
                            catch (error) {
                                reject(error);
                            }
                        });
                    }
                    catch (error) {
                        reject(error);
                    }
                });
            }

            conn.connect(node.serverConfig.options);
        });

        node.on('close', () => {
            try {
                conn.destroy();
            }
            catch (err) {
                // Do nothing as the node is closed anyway.
            }
        });
    }

    RED.nodes.registerType('ftp-download', FtpDownloadNode);
};
