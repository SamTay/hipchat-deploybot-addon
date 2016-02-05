var http = require("request");
var _ = require("lodash");
var crypto = require("crypto");

var exports = {};

function getToken(path) {
  var req, time, token;
  time = Date.now();
  token = (function() {
    var shasum = crypto.createHash("sha1");
    shasum.update(time + encodeURIComponent(path) + process.env.DEPLOYBOT_SECRET);
    return shasum.digest("hex");
  })();
  return time + " " + token;
}

function makeRequest(path, options, handleResponse) {
  http(_.extend(options, {
    uri: path,
    baseUrl: process.env.DEPLOYBOT_BASE_URL,
    headers: {
      "X-API-Token": getToken(path)
    },
    method: "GET",
    json: true
  }), handleResponse);
}

function getSkels(callback) {
  makeRequest("/api/list", {}, function(err, res, body) {
    callback(err, body.data);
  });
}

function getSkelCount(callback) {
  getSkels(function(err, data) {
    callback(err, data.length);
  });
}

function getEnvs(skel, callback) {
  makeRequest("/api/list/" + skel, {}, function(err, res, body) {
    callback(err, body.data);
  });
}

function getSkelsWithEnvs(callback) {
  getSkels(function(err, skels) {
    var data = {};
    if (err) {
      return callback(err);
    }
    var processed = 0;
    skels.forEach(function(skel, index, array) {
      getEnvs(skel, function(err, envs) {
        data[skel] = err ? err : envs.filter(function(env) {return env.length});
        if (++processed === array.length) {
          callback(null, data);
        }
      });
    });
  });
}

function startDeployment(skel, env, callback) {
  makeRequest("/api/start/" + skel + "/env/" + env, {method: 'POST'}, function(err, res, body) {
    callback(err, body.data);
  });
}

exports.getSkels = getSkels;
exports.getSkelCount = getSkelCount;
exports.getEnvs = getEnvs;
exports.getSkelsWithEnvs = getSkelsWithEnvs;

module.exports = exports;
