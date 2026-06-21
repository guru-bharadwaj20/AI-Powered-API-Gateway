'use strict';

const pino = require('pino');
const config = require('./config');

/**
 * Factory that creates a named Pino logger.
 * In development: pretty-printed with colours.
 * In production: pure JSON (machine-parseable for log aggregators).
 */
function createLogger(service) {
  const usePretty = config.log.pretty && config.env !== 'production';

  return pino({
    level: config.log.level,
    base: { service },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(usePretty
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              ignore: 'pid,hostname',
              messageFormat: '[{service}] {msg}'
            }
          }
        }
      : {})
  });
}

module.exports = createLogger;
