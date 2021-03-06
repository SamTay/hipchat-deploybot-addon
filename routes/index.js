var http = require('request');
var cors = require('cors');
var uuid = require('uuid');
var util = require('util');
var _ = require('lodash');
var qs = require('qs');
var deploybot = require('../lib/deploybot');
var helper = require('../lib/helper');

module.exports = function (app, addon) {
  var hipchat = require('../lib/hipchat')(addon);

  // simple healthcheck
  app.get('/healthcheck', function (req, res) {
    res.send('OK');
  });

  // Root route. This route will serve the `addon.json` unless a homepage URL is
  // specified in `addon.json`.
  app.get('/',
    function(req, res) {
      // Use content-type negotiation to choose the best way to respond
      res.format({
        // If the request content-type is text-html, it will decide which to serve up
        'text/html': function () {
          var homepage = url.parse(addon.descriptor.links.homepage);
          if (homepage.hostname === req.hostname && homepage.path === req.path) {
            res.render('homepage', addon.descriptor);
          } else {
            res.redirect(addon.descriptor.links.homepage);
          }
        },
        // This logic is here to make sure that the `addon.json` is always
        // served up when requested by the host
        'application/json': function () {
          res.redirect('/atlassian-connect.json');
        }
      });
    }
  );

  // TODO: Use this to set deploybot url/secret
  // This is an example route that's used by the default for the configuration page
  // https://developer.atlassian.com/hipchat/guide/hipchat-ui-extensions/configuration-page
  app.get('/config',
    // Authenticates the request using the JWT token in the request
    addon.authenticate(),
    function(req, res) {
      // The `addon.authenticate()` middleware populates the following:
      // * req.clientInfo: useful information about the add-on client such as the
      //   clientKey, oauth info, and HipChat account info
      // * req.context: contains the context data accompanying the request like
      //   the roomId
      res.render('config', req.context);
    }
  );

  // This is the glance that shows in the sidebar
  // https://developer.atlassian.com/hipchat/guide/hipchat-ui-extensions/glances
  app.get('/glance',
    cors(),
    addon.authenticate(),
    function(req, res) {
      deploybot.getSkelCount(function(err, skelCount) {
        if (err) {
          res.json({
            "label": {
              "type": "html",
              "value": "<b>Deploybot</b>"
            },
            "status": {
              "type": "lozenge",
              "value": {
                "label": ":cry:",
                "type": "error"
              }
            }
          });
        } else {
          res.json({
            "label": {
              "type": "html",
              "value": "<b>Deploybot</b>"
            },
            "status": {
              "type": "lozenge",
              "value": {
                "label": skelCount + " skels",
                "type": "success"
              }
            }
          });
        }
      });
    }
  );

  // This is an example end-point that you can POST to to update the glance info
  // TODO: Use this for success/fail deployment status
  // Room update API: https://www.hipchat.com/docs/apiv2/method/room_addon_ui_update
  // Group update API: https://www.hipchat.com/docs/apiv2/method/addon_ui_update
  // User update API: https://www.hipchat.com/docs/apiv2/method/user_addon_ui_update
  app.post('/update_glance',
    cors(),
    addon.authenticate(),
    function(req, res){
      res.json({
        "label": {
          "type": "html",
          "value": "Hello World!"
        },
        "status": {
          "type": "lozenge",
          "value": {
            "label": "All good",
            "type": "success"
          }
        }
      });
    }
  );

  // This is the sidebar controller that is launched when clicking on the glance.
  // https://developer.atlassian.com/hipchat/guide/hipchat-ui-extensions/views/sidebar
  app.get('/sidebar',
    addon.authenticate(),
    function(req, res) {
      deploybot.getSkelsWithEnvs(function(err, skels) {
        if (err) {
          helper.error(err);
          res.render('error', {error: err});
        } else {
          res.render('sidebar', {skels: skels});
        }
      });
    }
  );

  app.post('/deploy/:skel/:env',
    addon.authenticate(),
    function(req, res) {
      var skel = req.params.skel,
          env = req.params.env,
          options = req.query,
          roomId = req.identity.roomId,
          userName = req.body.user;
      handleDeployment(skel, env, options, roomId, userName, req, res);
    }
  );

  // This is an example dialog controller that can be launched when clicking on the glance.
  // https://developer.atlassian.com/hipchat/guide/hipchat-ui-extensions/views/dialog
  app.get('/deploy-dialog',
    addon.authenticate(),
    function(req, res) {
      res.render('deploy-dialog', {
        identity: req.identity
      });
    }
  );

  // Sample endpoint to send a card notification back into the chat room
  // See https://developer.atlassian.com/hipchat/guide/sending-messages
  app.post('/send_notification',
    addon.authenticate(),
    function (req, res) {
      var card = {
        "style": "link",
        "url": "https://www.hipchat.com",
        "id": uuid.v4(),
        "title": req.body.messageTitle,
        "description": "Great teams use HipChat: Group and private chat, file sharing, and integrations",
        "icon": {
          "url": "https://hipchat-public-m5.atlassian.com/assets/img/hipchat/bookmark-icons/favicon-192x192.png"
        }
      };
      var msg = '<b>' + card.title + '</b>: ' + card.description;
      var opts = { 'options': { 'color': 'yellow' } };
      hipchat.sendMessage(req.clientInfo, req.identity.roomId, msg, opts, card);
      res.json({ status: "ok" });
    }
  );

  // This is an example route to handle an incoming webhook
  // https://developer.atlassian.com/hipchat/guide/webhooks
  app.post('/webhook',
    addon.authenticate(),
    function(req, res) {
      hipchat.sendMessage(req.clientInfo, req.context.item.room.id, 'pong')
        .then(function(data){
          res.sendStatus(200);
        });
    }
  );

  // Notify the room that the add-on was installed. To learn more about
  // Connect's install flow, check out:
  // https://developer.atlassian.com/hipchat/guide/installation-flow
  addon.on('installed', function (clientKey, clientInfo, req) {
    hipchat.sendMessage(clientInfo, req.body.roomId, 'The ' + addon.descriptor.name + ' add-on has been installed in this room');
  });

  // Clean up clients when uninstalled
  addon.on('uninstalled', function (id) {
    addon.settings.client.keys(id + ':*', function (err, rep) {
      rep.forEach(function (k) {
        addon.logger.info('Removing key:', k);
        addon.settings.client.del(k);
      });
    });
  });

  // Allow authenticated requests to kill the app
  // Used for octohook reincarnation
  app.post('/kill',
    addon.authenticate(),
    function(req, res) {
      hipchat.sendMessage(req.clientInfo, req.context.item.room.id, 'Deploybot is reincarnating...')
        .then(function(data) {
          res.sendStatus(200);
          process.exit();
        });
    }
  );

  // Start deployment from notification
  // Used for octohook autodeployments
  // Example: /deploybot start RDS qa-1 ref=develop otherOption=otherValue
  app.post('/start-from-notification',
    addon.authenticate(),
    function(req, res) {
      var skel, env, userName, options = {};
      var message = req.body.item.message.message,
          userName = req.body.item.message.from,
          roomId = req.context.item.room.id,
          pattern = /start\s+([\w\-]+)\s+([\w\-]+)\s*(.*)/i,
          match = message.match(pattern);
      if (match) {
        skel = match[1];
        env = match[2];
        if (match[3]) {
          options = qs.parse(match[3], {plainObjects:true, delimiter: /\s+/});
          helper.debug('deployment options: ', options);
        }
        helper.debug(util.format('Deploying %s to %s from webhook notification', skel, env));
        handleDeployment(skel, env, options, roomId, userName, req, res);
      } else {
        var errorMsg = "I didn't understand that.<br>"
          + "The start deployment syntax is '/deploybot start CLIENT ENV [options]'<br>"
          + "For example: /deploybot start RDS qa-1 ref=unstable/Release_C";
        hipchat.sendMessage(req.clientInfo, req.context.item.room.id, errorMsg);
        res.json({status: "ok"});
      }
    }
  );

  function handleDeployment(skel, env, options, roomId, userName, req, res) {
    deploybot.startDeployment(skel, env, options, function(err, data) {
      var card, opts, msg, url, color;
      if (err) {
        helper.error(err);
        color = 'red';
        msg = util.format('Sorry, something went wrong. Error message: %s', err);
      } else {
        helper.debug(data);
        color = 'green';
        url = util.format('%s/log/%s', deploybot.getBaseUrl(), data.deployment_id.slice(0, 8));
        card = {
          title: util.format('%s -- %s Deployment', skel, env),
          description: data.message || '%s started deploying to %s on %s -- check the status by visiting the link.',
          style: 'link',
          url: url,
          id: uuid.v4(),
          icon: {
            url: "https://technologyconversations.files.wordpress.com/2015/12/docker-jenkins.png?w=300&h=214"
          }
        };
        card.description = util.format(card.description, userName, env, skel);
        msg = util.format('<a href="%s"><b>%s</b></a>: %s', url, card.title, card.description);
      }
      opts = {'options': {'color': color}};
      hipchat.sendMessage(req.clientInfo, roomId, msg, opts, card)
        .then(function(data) {
          res.json({status: "ok"});
        });
    });
  }
};
