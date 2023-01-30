/**
 * Return all keys for the specific language.
 *
 * @param {Array} store
 * @param {string} language
 * @returns
 */
const entriesForLanguage = (store, language = 'en') => {
  return store.map((entry) => {
    let title = '';
    if (entry.title.hasOwnProperty(language)) {
      title = entry.title[language]
    } else if (entry.title.hasOwnProperty('default')) {
      title = entry.title['default']
    }

    return {
      path: entry.path || '',
      title
    }
  })
}

const factory = async (trifid) => {
  const { config, logger } = trifid
  const { namespace, entries } = config

  if (!entries || !Array.isArray(entries)) {
    throw new Error(`'entries' should be a non-empty array`)
  }

  const configuredNamespace = namespace ?? 'default';
  const store = []

  let i = 0

  for (const entry of entries) {
    const { path, title } = entry
    if (!path || typeof path !== 'string') {
      throw new Error(`'path' should be a non-empty string`)
    }

    if (typeof title === 'string') {
      store.push({
        path,
        title: {
          default: title
        }
      })
      continue
    }

    if (title) {
      store.push({
        path,
        title
      })
      continue
    }

    throw new Error(`entry #${i} don't have a valid 'paths' array property configured`)
  }

  return (_req, res, next) => {
    logger.debug(`loaded menu into '${configuredNamespace}' namespace`)

    // just make sure that the `menu` entry exists
    if (!res.locals.menu) {
      res.locals.menu = {}
    }

    // add all configured entries for the specified namespace
    const lang = res?.locals?.currentLanguage || 'en'
    res.locals.menu[configuredNamespace] = entriesForLanguage(store, lang)

    // let's forward all of this to other middlewares
    return next()
  }
}

export default factory
