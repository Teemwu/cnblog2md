import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'fs-extra'
import dayjs from 'dayjs'
import Handlebars from 'handlebars'
import { ENCODING, TEMPLATE_PATH, USER_TEMPLATE_1, USER_TEMPLATE_2, TITLE_DATE_FORMATTER } from './constants.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const { pathExistsSync, readFileSync, readJSONSync } = fs

export const cwd = process.cwd()
export const version = readJSONSync(path.resolve(__dirname, '../package.json')).version

export const resolve = (dir) => path.resolve(cwd, dir)

/**
 * Get handlebars template
 * @param filePath handlebars template path
 * @returns Handlebars.TemplateDelegate<any>
 */
export const getTemplate = (filePath) => {
  return Handlebars.compile(readFileSync(filePath, { encoding: ENCODING }), { noEscape: true })
}

/**
 * Get handlebars template content
 * @param options handlebars template options
 * @returns string
 */
export const getTemplateContent = (options) => {
  let template

  if (pathExistsSync(resolve(USER_TEMPLATE_1))) {
    template = getTemplate(resolve(USER_TEMPLATE_1))
  } else if (pathExistsSync(resolve(USER_TEMPLATE_2))) {
    template = getTemplate(resolve(USER_TEMPLATE_2))
  } else {
    template = getTemplate(path.resolve(__dirname, TEMPLATE_PATH))
  }

  return template(options)
}

/**
 * Get note title
 * @param {string} title note title
 * @returns string
 */
export const getSafeTitle = (title) => title.replace(/:/g, '&#58;')

/**
 * Get public date
 * @param {string} date public note datetime string
 * @returns string
 */
export const getDate = (date) => dayjs(date).format(TITLE_DATE_FORMATTER)