var http = require("request");
var _ = require("lodash");
var crypto = require("crypto");
var helper = require ("./helper");
var qs = require("qs");

var exports = {};

function getToken(path) {
  var time, token;
  time = Date.now();
  token = (function() {
    var shasum = crypto.createHash("sha1");
    shasum.update(time + encodeURIComponent(path) + process.env.DEPLOYBOT_SECRET);
    return shasum.digest("hex");
  })();
  return time + " " + token;
}

function makeRequest(path, options, callback) {
  http(_.extend({
    uri: path,
    baseUrl: process.env.DEPLOYBOT_BASE_URL,
    headers: {
      "X-API-Token": getToken(path)
    },
    method: "GET",
    json: true
  }, options), function(err, res, body) {
    if (!err && res.statusCode == 200) {
      callback(null, body.data);
    } else if (body.message == 'exception' && body.data) {
      // In this case, body.data contains the error message
      callback(body.data);
    } else if (err) {
      callback(err);
    } else if (body.message) {
      callback(body.message);
    } else {
      callback('Unkown error.');
    }
  });
}

function getSkels(callback) {
  makeRequest("/api/list", {}, callback);
}

function getSkelCount(callback) {
  getSkels(function(err, skels) {
    callback(err, skels ? skels.length : null);
  });
}

function getEnvs(skel, callback) {
  makeRequest("/api/list/" + skel, {}, callback);
}

function getSkelsWithEnvs(callback) {
  getSkels(function(err, skels) {
    var data = [];
    if (err) {
      return callback(err);
    }
    var processed = 0;
    skels.forEach(function(skel, index, array) {
      getEnvs(skel, function(err, envs) {
        helper.debug(skel, envs);
        envs = err ? [] : envs.filter(function(env) {return env.length});
        data.push({skel: skel, envs: envs});
        if (++processed === array.length) {
          callback(null, _.sortBy(data, 'skel'));
        }
      });
    });
  });
}

function startDeployment(skel, env, options, callback) {
  options = options ? '?' + qs.stringify(options, {encode: false}) : '';
  makeRequest("/api/start/" + skel + "/" + env + options, {}, callback);
}

function getBaseUrl() {
  return process.env.DEPLOYBOT_BASE_URL.replace(/\/$/, "");
}

exports.getSkels = getSkels;
exports.getSkelCount = getSkelCount;
exports.getEnvs = getEnvs;
exports.getSkelsWithEnvs = getSkelsWithEnvs;
exports.startDeployment = startDeployment;
exports.getBaseUrl = getBaseUrl;

module.exports = exports;
