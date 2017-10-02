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

**Files**

The file paths may be defined in one of a number of ways.
- `msg.`: A variable on the msg object that contains an array of Strings or source Objects.
- `flow.`: A variable on the flow context object that contains an array of Strings or source Objects.
- `global.`: A variable on the global context object that contains an array of Strings or source Objects.
- `json`: A JSON array of Strings or source Objects.
- `string`: A singular path String.

**ex:**

~~~~
global.test = ["/path/to/ftp.file", "/path/to/another/ftp.file"];

// or

global.test = [
    {
        "src": "/path/to/ftp.file",
        "dest": "/path/to/local.file"
    }, {
        "src": "/path/to/another/ftp.file",
        "dest": "/path/to/another/local.file"
    }
];
~~~~

**Directory**

The directory path may be defined in one of a number of ways.
- `msg.`: A variable on the msg object that contains a local path String.
- `flow.`: A variable on the flow context object that contains a local path String
- `global.`: A variable on the global context object that contains a local path String
- `string`: A singular local path String.

The files defined in the files field will be downloaded into the directory field, if the files field is an array of
objects with dest fields set.  The final destination will be `directory + "/" + file.dest`

**Output**

An Array of local file path Strings is placed in `msg.payload`

Acknowledgements
----------------

The node-red-contrib-ftp-download uses the following open source software:

- [node-ftp](https://github.com/mscdex/node-ftp) is an FTP client module for node.js that provides an asynchronous interface for communicating with an FTP server.

