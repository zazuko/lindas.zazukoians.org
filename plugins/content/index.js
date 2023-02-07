import { promises as fs } from 'fs';
import { join as pathJoin } from 'path';
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
 * Get all subdirectories of that particular directory.
 *
 * @param {string} path path of the starting directory
 * @returns list of all directories present in that directory
 */
const getItems = async (path) => {
  const directories = []

  const pathContent = await fs.readdir(path, { withFileTypes: true })

  for (const item of pathContent) {
    if (!item.isDirectory()) {
      continue
    }
    const fullPath = pathJoin(path, item.name)
    directories.push({
      name: item.name,
      path: fullPath
    })
  }

  return directories
}

/**
 * Read all markdown files from a directory and convert them in HTML format.
 *
 * @param {string} path path of the directory to read
 * @returns list of files that are in that directory
 */
const getContent = async (path) => {
  const files = []

  const pathContent = await fs.readdir(path, { withFileTypes: true })

  for (const item of pathContent) {
    if (item.isDirectory()) {
      continue
    }
    const fullPath = pathJoin(path, item.name)
    if (!fullPath.endsWith('.md')) {
      continue
    }

    const content = await fs.readFile(fullPath, 'utf-8')
    const html = await convertToHtml(content)
    files.push({
      language: item.name.replace(/\.md*/, ''),
      path: fullPath,
      html
    })
  }

  return files
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

  for (const [key, item] of Object.entries(store)) {
    let value = null
    let fallbackValue = null

    item.map((item) => {
      if (item.language === language) {
        value = item.html
      }
      if (item.language === 'default') {
        fallbackValue = item.html
      }
    })

    if (value === null && fallbackValue !== null) {
      value = fallbackValue
    }

    if (value === null) {
      value = ''
    }

    finalStore[key] = value
  }

  return finalStore
}

const factory = async (trifid) => {
  const { config, logger } = trifid
  const { namespace, directory } = config

  // check config
  const configuredNamespace = namespace ?? 'default';
  if (!directory || typeof directory !== 'string') {
    throw new Error(`'directory' should be a non-empty string`)
  }

  const store = {}
  const items = await getItems(directory)

  for (const item of items) {
    store[item.name] = await getContent(item.path)
  }

  return async (_req, res, next) => {
    logger.debug(`loaded store into '${configuredNamespace}' namespace`)

    // just make sure that the `content-plugin` entry exists
    if (!res.locals['content-plugin']) {
      res.locals['content-plugin'] = {}
    }

    // add all configured entries for the specified namespace
    const lang = res?.locals?.currentLanguage || 'en'
    res.locals['content-plugin'][configuredNamespace] = entriesForLanguage(store, lang)

    // let's forward all of this to other middlewares
    return next()
  }
}

export default factory
