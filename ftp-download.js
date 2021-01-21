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

        const flow = this.context().flow;
        const global = this.context().global;
        const node = this;
        node.server = n.server;
        node.serverConfig = RED.nodes.getNode(node.server);
        node.files = n.files;
        node.directory = n.directory;
        node.filesType = n.filesType || "str";
        node.directoryType = n.directoryType || "str";
        node.output = n.output;

        let fileList = [];
        let directory = "";

        node.on('input', (msg) => {
            const conn = new ftp();
            
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

            // Load the directory from the appropriate variable.
            try {
                switch (node.directoryType) {
                    case 'msg':
                        directory = msg[node.directory];
                        break;
                    case 'flow':
                        directory = flow.get(node.directory);
                        break;
                    case 'global':
                        directory = global.get(node.directory);
                        break;
                    default:
                        directory = node.directory;
                }
            }
            catch (err) {
                node.error("Could not load directory variable, type: " + node.directoryType + " location: " + node.directory, msg);
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
                        msg[node.output] = filePaths;
                        conn.end();
                        node.send(msg);
                    })
                    .catch((err) => {
                        msg.payload = {
                            fileList: fileList,
                            directory: directory,
                            caught: err
                        };
                        node.error("FTP download failed", msg);
                    })
            });

            function download(file) {
                return (filePaths) => new Promise((resolve, reject) => {
                    try {
                        let source = file;
                        if(typeof file.src === "string")
                            source = file.src;

                        let destination = path.join(directory, path.basename(source));
                        if(typeof file.dest === "string"){
                            destination = path.join(directory, file.dest);
                        }

                        conn.get(source, (err, stream) => {
                            if (err)
                                reject({"paths": filePaths, "error": err});

                            filePaths.push(destination);
                            try {
                                let writestream = fs.createWriteStream(destination);
                                writestream.on('error', (err) => {
                                    reject({"paths": filePaths, "error": err});
                                });
                                stream.once('finish', () => resolve(filePaths));
                                stream.pipe(writestream);
                            }
                            catch (error) {
                                reject({"paths": filePaths, "error": error});
                            }
                        });
                    }
                    catch (error) {
                        reject({"paths": filePaths, "error": error});
                    }
                });
            }

            conn.on('error', (err) => {
                msg.payload = err;
                node.error("An error occurred with the FTP library.", msg);
            });

            try{
                conn.connect(node.serverConfig.options);
            }
            catch (err) {
                msg.payload = err;
                node.error("Could not connect to the FTP server.", msg);
            }
        });

        node.on('close', () => {
            try {
                // conn.destroy();
                // Line removed since connection should be already closed
            }
            catch (err) {
                // Do nothing as the node is closed anyway.
            }
        });
    }

    RED.nodes.registerType('ftp-download', FtpDownloadNode);
};
