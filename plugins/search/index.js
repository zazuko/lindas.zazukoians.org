import { dirname } from 'path'
import { fileURLToPath } from 'url'
// import { resolve } from 'import-meta-resolve'
// import express from 'express'

const currentDir = dirname(fileURLToPath(import.meta.url))

const factory = async (trifid) => {
  const { render, server } = trifid

  // serve static files for zack-search
  // const zackSearchPath = await resolve('zack-search', import.meta.url)
  // server.use('/datasets-assets/zack.js', express.static(zackSearchPath.replace(/^file:\/\//, '')))
  // server.use('/datasets/shape/', express.static(`${currentDir}/shape/`))
  // server.use('/datasets/components/', express.static(`${currentDir}/components/`))
  // server.use('/datasets/lib/', express.static(`${currentDir}/lib/`))
  // server.use('/datasets/templates/', express.static(`${currentDir}/templates/`))
  // server.use('/datasets-public-assets/', express.static(`${currentDir}/public/`))

  return async (_req, res, _next) => {
    res.send(await render(`${currentDir}/view.hbs`, {
      currentLanguage: res.locals.currentLanguage,
      defaultLanguage: res.locals.defaultLanguage,
    }, {
      title: 'Datasets',
      locals: res.locals
    }))
  }
}

export default factory
