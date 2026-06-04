const graphHelper = require('../../helpers/graph')
const _ = require('lodash')
const CleanCSS = require('clean-css')
const fs = require('fs-extra')
const path = require('path')
const yaml = require('js-yaml')

/* global WIKI */

module.exports = {
  Query: {
    async theming() { return {} }
  },
  Mutation: {
    async theming() { return {} }
  },
  ThemingQuery: {
    async themes(obj, args, context, info) {
      const themesPath = path.join(WIKI.ROOTPATH, 'server/themes')
      const themeDirs = await fs.readdir(themesPath)
      const themes = await Promise.all(themeDirs.map(async key => {
        try {
          const themePath = path.join(themesPath, key, 'theme.yml')
          const theme = yaml.safeLoad(await fs.readFile(themePath, 'utf8'))
          return {
            key,
            title: theme.name || key,
            author: theme.author || ''
          }
        } catch (err) {
          return null
        }
      }))

      return _.sortBy(_.compact(themes), theme => theme.key === 'default' ? '0' : `1-${theme.title}`)
    },
    async config(obj, args, context, info) {
      return {
        theme: WIKI.config.theming.theme,
        iconset: WIKI.config.theming.iconset,
        darkMode: WIKI.config.theming.darkMode,
        tocPosition: WIKI.config.theming.tocPosition || 'left',
        injectCSS: new CleanCSS({ format: 'beautify' }).minify(WIKI.config.theming.injectCSS).styles,
        injectHead: WIKI.config.theming.injectHead,
        injectBody: WIKI.config.theming.injectBody
      }
    }
  },
  ThemingMutation: {
    async setConfig(obj, args, context, info) {
      try {
        if (!_.isEmpty(args.injectCSS)) {
          args.injectCSS = new CleanCSS({
            inline: false
          }).minify(args.injectCSS).styles
        }

        WIKI.config.theming = {
          ...WIKI.config.theming,
          theme: args.theme,
          iconset: args.iconset,
          darkMode: args.darkMode,
          tocPosition: args.tocPosition || 'left',
          injectCSS: args.injectCSS || '',
          injectHead: args.injectHead || '',
          injectBody: args.injectBody || ''
        }

        await WIKI.configSvc.saveToDb(['theming'])

        return {
          responseResult: graphHelper.generateSuccess('Theme config updated')
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    }
  }
}
