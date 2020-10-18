import bodyParser from 'body-parser'
import compression from 'compression'
import cors from 'cors'
import express from 'express'
import historyFallback from 'express-history-api-fallback'
import helmet from 'helmet'
import hpp from 'hpp'
import path from 'path'

const distPathToServe = path.resolve(__dirname, '../frontend')

/**
 * Init production server
 */
const server = express()

/** Set port */
server.set('port', process.env.PORT || 3001)
/** Set compression */
server.use(compression())
/** Set body parser */
server.use(
  bodyParser.json({
    type: ['application/json']
  })
)
server.use(bodyParser.urlencoded({ extended: true }))

/**
 * Security
 */

/** Set force https */
if (process.env.HTTPS === 'true') {
  server.use((req, res, next) => {
    const header = req.get('x-forwarded-proto')

    return req.secure || !header || header === 'https'
      ? next()
      : res.redirect(`https://${req.get('host')}${req.url}`, 301)
  })
}

/** Set HTTP parameter pollution */
server.use(hpp())

/** Set cors */
server.use(
  cors({
    origin: process.env.SERVER_BASE_URL,
    optionsSuccessStatus: 200
  })
)

/** Set X-Download-Options header */
server.use(helmet.ieNoOpen())

/** Set X-Content-Type-Options header */
server.use(helmet.noSniff())

/** Remove X-Powered-By header */
server.use(helmet.hidePoweredBy())

/** Set X-XSS-Protection header */
server.use(helmet.xssFilter())

/** Set Referrer-Policy header */
server.use(helmet.referrerPolicy({ policy: 'same-origin' }))

/** Set Expect-CT header */
server.use(
  helmet.expectCt({
    reportUri: process.env.CT_REPORT_URI,
    maxAge: 86400,
    enforce: true
  })
)

/** Set Content-Security-Policy header */
server.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", 'https:', process.env.DOMAIN_NAME],
      fontSrc: ["'self'", 'data:'],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'", 'https:', 'wss:', process.env.API_URL],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"],
      reportUri: [process.env.CSP_REPORT_URI],
      reportTo: [process.env.CSP_REPORT_URI],
      upgradeInsecureRequests: [],
      blockAllMixedContent: []
    }
  })
)

/** Set X-DNS-Prefetch-Control header */
server.use(
  helmet.dnsPrefetchControl({
    allow: true
  })
)

/** Set X-Frame-Options header */
server.use(
  helmet.frameguard({
    action: 'deny'
  })
)

/** Set X-Permitted-Cross-Domain-Policies header */
server.use(
  helmet.permittedCrossDomainPolicies({
    permittedPolicies: 'none'
  })
)

/** Set Strict-Transport-Security header */
server.use(
  helmet.hsts({
    maxAge: 15552000,
    includeSubDomains: true,
    preload: true
  })
)

/** Set Permissions-Policy header */
server.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), fullscreen=(self)')
  next()
})

/** Set Report-To header (Report ) */
server.use((_req, res, next) => {
  res.setHeader(
    'Report-To',
    JSON.stringify({
      group: 'default',
      max_age: 31536000,
      endpoints: [{ url: process.env.API_REPORT_URI }],
      include_subdomains: true
    })
  )
  next()
})

/**
 * Serve static files
 */
server.use(
  express.static(distPathToServe, {
    dotfiles: 'ignore',
    etag: false,
    extensions: ['html'],
    index: 'index.html',
    maxAge: '0',
    lastModified: false,
    redirect: true
  })
)

/**
 * Fallback history for SPA
 */
server.use(
  historyFallback('index.html', {
    root: distPathToServe,
    lastModified: false,
    maxAge: '0',
    dotfiles: 'ignore'
  })
)

/**
 * Permit preflight request
 */
server.options('*', cors())

export default server