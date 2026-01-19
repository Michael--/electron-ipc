const mainConfig = require('./webpack.main.config')
const preloadConfig = require('./webpack.preload.config')
const rendererConfig = require('./webpack.renderer.config')

/**
 * Combined webpack configuration for all Electron processes
 */
module.exports = [mainConfig, preloadConfig, rendererConfig]
