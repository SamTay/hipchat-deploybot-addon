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
    if (err) {
      callback(err);
    } else {
      callback(null, body);
    }
  });
}

function getSkelCount(callback) {
  getSkels(function(err, body) {
    callback(err, body.data.length);
  });
}

function startDeployment(skel, env, callback) {
  makeRequest("/api/start/" + skel + "/env/" + env, {method: 'POST'}, function(err, res, body) {
    if (err) {
      callback(err);
    } else {
      callback(err, body);
    }
  });
}

exports.getSkels = getSkels;
exports.getSkelCount = getSkelCount;

module.exports = exports;
