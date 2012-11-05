/**
 * Command Shots - CommandLine Handler
 *
 * Usage:
 *      firefox -capture <url> -delay <duration> -format <jpg|png> -quality <0-100> -width <pixels> -saveto <path>
 *
 * Default Values:
 *      url: Required (No default value)
 *      duration: 2000
 *      format: jpg
 *      quality: 80
 *      width: 1920
 *      saveto: Required (No default value)
 */
var cmdHandler =
    {
        /**
         * Command Parameters
         * @var object
         */
        params:{},

        /**
         * nsISupports implementation
         * @param aIID
         * @return {*}
         * @constructor
         */
        QueryInterface:function (aIID) {
            return this;
        },

        /**
         * nsIFactory implementation
         *
         * @param aOuter
         * @param aIID
         * @return {*}
         */
        createInstance:function (aOuter, aIID) {
            return this.QueryInterface(aIID);
        },

        /**
         * nsICommandLineHandler implementation
         *
         * @param aCmdLine
         */
        handle:function (aCmdLine) {
            /*
             * 1. Get the Commandline parameters
             */
            var params = {
                url:this.getArgument(aCmdLine, 'capture'),
                delay:this.getArgument(aCmdLine, 'delay'),
                format:this.getArgument(aCmdLine, 'format'),
                quality:this.getArgument(aCmdLine, 'quality'),
                width:this.getArgument(aCmdLine, 'width'),
                saveto:this.getArgument(aCmdLine, 'saveto')
            };
            params = this.validateInput(params);
            if (!params) {
                //nothing to do!
                return;
            }
            this.params = params;

            /*
             * 2. Attach Observer Events
             */
            this.addObserver('document-element-inserted');
        },

        /**
         * Attach an observer
         * @param aTopic string
         */
        addObserver:function (aTopic) {
            var obsSvc = Components.classes["@mozilla.org/observer-service;1"]
                .getService(Components.interfaces.nsIObserverService);
            obsSvc.addObserver(this, aTopic, false);
        },

        /**
         * Get Preference (String only)
         * @param aPref
         * @return {*}
         */
        getPref:function (aPref) {
            var prefSvc = Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefBranch);
            return prefSvc.getCharPref(aPref);
        },

        /**
         * Set Preference (String only)
         * TODO: Implement
         * @param aPref object
         * @param aValue mixed
         */
        setPref:function (aPref, aValue) {

        },

        /**
         * nsIobserve Implementation
         *
         * @param aWindow object
         * @param aTopic string
         * @param aParam object
         */
        observe:function (aWindow, aTopic, aParam) {
            var self = this,
                location = aWindow.location.toString();
            /*
             1. Redirects the Browser
             */
            if (location === 'about:home') {
                var window = aWindow.defaultView;
                window.resizeTo(this.params.width, 500);
                window.location = this.params.url;
            }
            /*
             2. Capture the page with Canvas
             */
            if (
                location == this.params.url
                    || location == this.params.url + '/'
                    || location..replace('www.', '') == this.params.url
                    || location..replace('www.', '') == this.params.url + '/'
                ) {
                var window = aWindow.defaultView;
                var doc = window.document;
                window.setTimeout(function () {
                    // Capture the canvas
                    var canvas = self.drawCanvas(window, doc.documentElement.scrollHeight);
                    // Save the Canvas to a file
                    self.saveCanvas(canvas);
                    // Exit FireFox
                    self.exitFireFox();
                }, self.params.delay);
            }
        },

        /**
         * Close the firefox instance
         */
        exitFireFox:function () {
            Components
                .classes['@mozilla.org/toolkit/app-startup;1']
                .getService(Components.interfaces.nsIAppStartup)
                .quit(Components.interfaces.nsIAppStartup.eAttemptQuit)
        },

        /**
         * Return a Canvas of the whole page
         *
         * @param win object
         * @param height int
         * @return {Element}
         */
        drawCanvas:function (win, height) {
            var left = 0, top = 0, width = this.params.width;

            /*
             Create a new canvas element
             */
            var canvas = win.document.createElementNS("http://www.w3.org/1999/xhtml", "html:canvas");
            canvas.style.width = canvas.style.maxwidth = String(width) + "px";
            canvas.style.height = canvas.style.maxheight = String(height) + "px";
            canvas.width = width;
            canvas.height = height;

            /*
             Draw a rectangle inside the canvas
             */
            var ctx = canvas.getContext("2d");
            ctx.clearRect(left, top, width, height);
            ctx.save();
            ctx.drawWindow(win, left, top, width, height, "rgb(255,255,255)");
            ctx.restore();

            // Return the canvas
            return canvas;
        },

        /**
         * Save a Canvas to an image file.
         * @param canvas object
         */
        saveCanvas:function (canvas) {
            // Convert the Canvas to a Binary Stream
            binStream = this.getBinaryStream(canvas);
            // Create a new File Object
            nsIFile = this.getFileObj();
            // Save the Binary Stream to the File
            this.saveOutputStream(binStream, nsIFile);
        },

        /**
         * Returns a Binary Stream from the Canvas data
         * @param canvas object Canvas element
         * @return object nsIBinaryInputSteream
         */
        getBinaryStream:function (canvas) {
            var s = canvas.toDataURL('image/' + this.params.format, this.params.quality / 100);
            var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                .getService(Components.interfaces.nsIIOService);
            var uriObj = ioService.newURI(s, null, null);
            var dataChannel = ioService.newChannelFromURI(uriObj);
            var binStream = Components.classes["@mozilla.org/binaryinputstream;1"]
                .createInstance(Components.interfaces.nsIBinaryInputStream);
            binStream.setInputStream(dataChannel.open());
            return binStream;
        },

        /**
         * Returns a new nsIFile Object
         * @return object snILocalFile
         */
        getFileObj:function () {
            var file = Components.classes["@mozilla.org/file/local;1"].
                createInstance(Components.interfaces.nsILocalFile);
            file.initWithPath(this.params.saveto);
            return file;
        },

        /**
         * Save the Binary Stream to the local file
         * @param object binStream
         * @param object file
         */
        saveOutputStream:function (binStream, file) {
            var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                createInstance(Components.interfaces.nsIFileOutputStream);

            foStream.init(file, 0x02 | 0x08 | 0x20, 0x1B6, 0);
            const kMaxBlockSize = 65536;
            var remaining = binStream.available();
            while (remaining > 0) {
                var count = (remaining > kMaxBlockSize) ? kMaxBlockSize : remaining;
                var b = binStream.readBytes(count);
                foStream.write(b, count);
                remaining -= count;
            }
            foStream.close();
        },

        /**
         * Function implemented to avoid the default behavior
         * of throwing an error if the option is not found.
         *
         * @param Object aCmdLine
         * @param String Arg
         * @return {String|Boolean}
         */
        getArgument:function (aCmdLine, Arg) {
            try {
                var param = aCmdLine.handleFlagWithParam(Arg, false);
            }
            catch (ex) {

            }
            return param;
        },

        /**
         * Validates commandline input
         * @param Object params
         * @return {Boolean|Object}
         */
        validateInput:function (params) {
            if (!params.url) {
                return false;
            }
            if (!params.delay) {
                params.delay = 2000;
            }
            if (!params.width) {
                params.width = 1920;
            }
            if (!params.format) {
                params.format = 'jpg';
            }
            if (!params.quality) {
                params.quality = 80;
            }
            if (!params.saveto) {
                return false;
            }
            return params;
        },

        /**
         * Commandline options documentation
         * @return {String}
         */
        helpInfo:function () {
            var help = '-capture <url> Save image of website' + "\n" +
                '-delay <duration> Wait for page in ms to load' + "\n" +
                '-format <jpg|png> Specify the format of the image' + "\n" +
                '-quality <0-100> Specify quality for JPEG format' + "\n" +
                '-width <pixels> Specify the window width in pixels' + "\n" +
                '-saveto <path> Save to Path';
            return help;
        }


    }
    ;


// For Firefox 4 / Gecko 2:
function NSGetFactory(aClassID) {
    return cmdHandler;
}



