import { promises as fs } from 'fs';
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'

/**
 * Return a HTML string from a Markdown string.
 *
 * @param {string} markdownString
 * @returns HTML string
 */
const convertToHtml = async (markdownString) => {
  const html = await unified()
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdownString)

  return html.toString()
}

/**
 * Load all files into the store.
 *
 * @param {Record<string, any>} store
 * @param {string} name
 * @param {Record<string, any>} paths
 */
const dataLoader = async (store, name, paths) => {
  store[name] = {}

  for (const [variable, path] of Object.entries(paths)) {
    const content = await fs.readFile(path, 'utf-8')
    store[name][variable] = await convertToHtml(content)
  }
}

/**
 * Return all keys for the specific language.
 *
 * @param {Record<string, any>} store
 * @param {string} language
 * @returns
 */
const entriesForLanguage = (store, language = 'en') => {
  const finalStore = {}

  for (const [key, path] of Object.entries(store)) {
    if (!path) {
      finalStore[key] = ''
      continue
    }

    if (path[language]) {
      finalStore[key] = path[language]
      continue
    }

    if (path['default']) {
      finalStore[key] = path['default']
      continue
    }

    finalStore[key] = ''
  }

  return finalStore
}

const factory = async (trifid) => {
  const { config, logger } = trifid
  const { namespace, entries } = config

  if (!entries || !Array.isArray(entries)) {
    throw new Error(`'entries' should be a non-empty array`)
  }

  const configuredNamespace = namespace ?? 'default';
  const store = {}

  for (const entry of entries) {
    const { name, paths } = entry
    if (!name || typeof name !== 'string') {
      throw new Error(`'name' should be a non-empty string`)
    }

    if (typeof paths === 'string') {
      await dataLoader(store, name, {
        default: paths
      })
      continue
    }

    if (paths) {
      await dataLoader(store, name, paths)
      continue
    }

    throw new Error(`entry '${name}' don't have a valid 'paths' array property configured`)
  }

  return async (_req, res, next) => {
    logger.debug(`loaded store into '${configuredNamespace}' namespace`)

    // just make sure that the `content-plugin` entry exists
    if (!res.locals['content-plugin']) {
      res.locals['content-plugin'] = {}
    }

    // add all configured entried for the specified namespace
    const lang = res?.locals?.currentLanguage || 'en'
    res.locals['content-plugin'][configuredNamespace] = entriesForLanguage(store, lang)

    // let's forward all of this to other middlewares
    return next()
  }
}

export default factory
