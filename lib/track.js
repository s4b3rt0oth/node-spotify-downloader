// Generated by CoffeeScript 1.10.0
(function() {
  var Logger, Path, Track, domain, fs, id3, mkdirp,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  fs = require("fs");

  mkdirp = require("mkdirp");

  id3 = require("node-id3");

  domain = require("domain");

  Path = require("path");

  Logger = require("./log");

  Logger = new Logger();

  Track = (function() {
    function Track(uri, config, callback) {
      this.uri = uri;
      this.config = config;
      this.callback = callback;
      this.writeMetadata = bind(this.writeMetadata, this);
      this.downloadFile = bind(this.downloadFile, this);
      this.createDirs = bind(this.createDirs, this);
      this.fixFilename = bind(this.fixFilename, this);
      this.process = bind(this.process, this);
      this.track = {};
      this.file = {};
      this.retryCounter = 0;
    }

    Track.prototype.setSpotify = function(spotify) {
      this.spotify = spotify;
    };

    Track.prototype.process = function(uri, config, callback) {
      this.uri = uri;
      this.config = config;
      this.callback = callback;
      return this.spotify.get(this.uri, (function(_this) {
        return function(err, track) {
          if (err) {
            return typeof _this.callback === "function" ? _this.callback(err) : void 0;
          }
          _this.track = track;
          return _this.createDirs();
        };
      })(this));
    };

    Track.prototype.fixFilename = function() {
      return this.file.name = this.file.name.replace(/[\/\\?%*:|"<>]/g, "");
    };

    Track.prototype.createDirs = function() {
      var stats;
      this.config.directory = Path.resolve(this.config.directory);
      this.file.name = this.track.name.replace(/\//g, " - ");
      this.file.path = this.config.directory + "/" + this.fixFilename(this.file.name) + ".mp3";
      if (fs.existsSync(this.file.path)) {
        stats = fs.statSync(this.file.path);
        if (stats.size !== 0) {
          Logger.Info("Already downloaded: " + this.track.artist[0].name + " - " + this.track.name);
          return typeof this.callback === "function" ? this.callback() : void 0;
        }
      }
      if (!fs.existsSync(this.config.directory)) {
        mkdirp.sync(this.config.directory);
      }
      return this.downloadFile();
    };

    Track.prototype.downloadFile = function() {
      var d;
      Logger.Log("Downloading: " + this.track.artist[0].name + " - " + this.track.name);
      d = domain.create();
      d.on("error", (function(_this) {
        return function(err) {
          Logger.Error("Error received: " + err);
          if (("" + err).indexOf("Rate limited") > -1) {
            Logger.Info(err + " ... { Retrying in 10 seconds }");
            if (_this.retryCounter < 2) {
              _this.retryCounter++;
              return setTimeout(_this.downloadFile, 10000);
            } else {
              Logger.Error("Unable to download song. Continuing");
              return typeof _this.callback === "function" ? _this.callback() : void 0;
            }
          } else {
            return typeof _this.callback === "function" ? _this.callback() : void 0;
          }
        };
      })(this));
      return d.run((function(_this) {
        return function() {
          var err, error, out;
          out = fs.createWriteStream(_this.file.path);
          try {
            return _this.track.play().pipe(out).on("finish", function() {
              Logger.Log("Done: " + _this.track.artist[0].name + " - " + _this.track.name);
              return _this.writeMetadata();
            });
          } catch (error) {
            err = error;
            Logger.Error("Error while downloading track! " + err);
            return typeof _this.callback === "function" ? _this.callback() : void 0;
          }
        };
      })(this));
    };

    Track.prototype.writeMetadata = function() {
      var meta;
      meta = {
        artist: this.track.artist[0].name,
        album: this.track.album.name,
        title: this.track.name,
        year: "" + this.track.album.date.year,
        trackNumber: "" + this.track.number
      };
      id3.write(meta, this.file.path);
      return typeof this.callback === "function" ? this.callback() : void 0;
    };

    return Track;

  })();

  module.exports = Track;

}).call(this);