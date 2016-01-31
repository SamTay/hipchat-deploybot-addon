# Hipchat Deploybot Add-on

This is a Hipchat Connect add-on that integrates with a custom dockerized deploybot. Built using [atlassian-connect-express-hipchat](https://bitbucket.org/atlassianlabs/atlassian-connect-express-hipchat).

## Installation

This add-on is a node app that must be running on a dedicated server, and then configured from within Hipchat.

#### Running the app

Environment variables include
- ``AC_LOCAL_BASE_URL``: the app host (see [ngrok](https://github.com/inconshreveable/ngrok) for local development)
- ``NODE_ENV``: production/development (defaults to development)

To start the app:
```bash
AC_LOCAL_BASE_URL=https://<your-add-on-host> \
NODE_ENV=production node app.js
```

#### Hipchat configuration


