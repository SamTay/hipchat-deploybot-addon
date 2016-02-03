var http = require("request");
var _ = require("lodash");
var crypto = require("crypto");

var exports = {};
var baseRequest = http.defaults({
  method: "GET",
  baseUrl: process.env.DEPLOBOT_BASE_URL,
  json: true
});

function getTokenHeader(path) {
  var req, time, token;
  time = Date.now();
  token = (function() {
    var shasum;
    shasum = crypto.createHash("sha1");
    shasum.update(time + encodeURIComponent(path) + process.env.DEPLOYBOT_SECRET);
    return shasum.digest("hex");
  })();
  return time + " " + token);
}

function makeRequest(path, options, handleResponse) {
  baseRequest(_.extend(options, {
    uri: path,
    headers: {
      "X-API-Token": getTokenHeader(path)
    }
  }), handleResponse);
}

function getSkels() {
  var count = 0;
  makeRequest("/api/list", {}, function(err, res, body) {
    // do stuffs
  })
}

function start(skel, env) {
  makeRequest("api/start/" + skel + "/env/" + env, {method: 'POST'}, function(err, res, body) {
    // do stuffs
  });
}

exports.getSkels = getSkels; //TODO class structure like hubot approach

module.exports = function() {

}
