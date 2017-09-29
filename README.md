node-red-contrib-ftp-download
========================
A Node-RED node for FTP Downloads.

Install
-------
Run the following command in the root directory of your Node-RED install

    npm install node-red-contrib-ftp-download

Usage
-------

This node allows you to download one or more files within a single connection.

The file paths may be defined in one of a number of ways.
- `msg.`: A variable on the msg object that contains an array of Strings.
- `flow.`: A variable on the flow context object that contains an array of Strings.
- `global.`: A variable on the global context object that contains an array of Strings.
- `json`: A JSON array of Strings.
- `string`: A singular path String.

The destination path may be defined in one of a number of ways.
- `msg.`: A variable on the msg object that contains a local path String.
- `flow.`: A variable on the flow context object that contains a local path String
- `global.`: A variable on the global context object that contains a local path String
- `string`: A singular local path String.

As an output an Array of local file path Strings is places in `msg.payload`

Acknowledgements
----------------

The node-red-contrib-ftp-download uses the following open source software:

- [node-ftp](https://github.com/mscdex/node-ftp) is an FTP client module for node.js that provides an asynchronous interface for communicating with an FTP server.

