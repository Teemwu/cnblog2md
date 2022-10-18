'use strict'

import path from 'node:path'
import fs from 'fs-extra'
import dayjs from 'dayjs'
import axios from 'axios'
import opts from './commander.mjs'
import { parse } from 'node-html-parser'
import TurndownService from 'turndown'
import Languagedetection from '@vscode/vscode-languagedetection'
import { BUNDLED_LANGUAGES } from 'shiki'
import { AUTHOR_REGEXP, BLOGID_REGEXP, CODE_REGEXP, CONTENT_REGEXP, DATE_REGEXP, DIR_REGEXP, ENCODING, FILENAME_REGEXP, HTML_CONTENT_REGEXP, IMAGE_DATE_FORMATTER, IMAGE_REGEXP, LINK_REGEXP, NOTE_REGEXP, TITLE_REGEXP } from './constants.mjs'
import { cwd, getSafeTitle, getTemplateContent, resolve } from './utils.mjs'
import Log from './log.mjs'

const { readFileSync, outputFile } = fs

axios.defaults.timeout = 2e4

const log = new Log()
// get the args
const { file, img, md, mdimg, auth } = opts
// load the blog's backup xml file
const xml = readFileSync(resolve(file), { encoding: ENCODING })
// get blogs
const notes = xml.match(new RegExp(NOTE_REGEXP, 'g'))

/**
 * Load note images
 * @param {string} item markdown image block
 * @param {string} date nonte post date
 * @param {number} index image index
 * @returns {Promise<string[]>}
 */
const loadImage = async (item, date, index) => {
  const url = IMAGE_REGEXP.exec(item)[2]

  try {
    const res = await axios.get(url, { responseType: 'arraybuffer' })

    if (!res || !res.data) {
      log.fail('Cannot to load image!')
      return [item, url]
    }

    const format = (tpl) => dayjs(date).format(tpl)
    const ext = '.' + url.split('.').pop()
    const dir = img.replace(DIR_REGEXP, (_, m) => format(m))
    const mdImgDir = mdimg ? mdimg.replace(DIR_REGEXP, (_, m) => format(m)) : dir
    const fileName = format(IMAGE_DATE_FORMATTER) + index + ext
    const outputImgDir = path.resolve(cwd, dir, fileName)

    await outputFile(outputImgDir, res.data)

    return [item, path.resolve(mdImgDir, fileName).replace(cwd, '')]
  } catch (error) {
    log.fail(error)
    log.fail(url)
    return [item, url]
  }
}

/**
 * Format image path
 * @param {string} mdFile markdown string
 * @param {string} date public date string
 * @returns {Promise<{[key:string]:string}>}
 */
const getMdImgMap = async (mdFile, date) => {
  const matched = mdFile.match(new RegExp(IMAGE_REGEXP, 'gi'))

  if (matched) {
    const promises = []

    matched.forEach((item, index) => promises.push(loadImage(item, date, index)))

    if (!promises.filter((p) => p).length) return null

    const data = await Promise.all(promises)

    if (!data) return null

    const entries = new Map(data)

    return Object.fromEntries(entries)
  }

  return null
}

/**
 * Get blog id
 * @param url note blog url
 * @returns number
 */
const getBlogId = async (url) => {
  try {
    const res = await axios.get(url)
    return parseInt(BLOGID_REGEXP.exec(res.data)[1], 10)
  } catch (error) {
    if (error.response.status === 404) return -1
    log.fail(error)
    return undefined
  }
}

/**
 * Get blog categories and tages
 * @param url blog url
 * @returns {string[],string[],boolean}
 */
const getCategoriesTags = async (url) => {
  try {
    const postId = url.split('/').pop().replace('.html', '')
    const blogId = await getBlogId(url)
    const isPublished = blogId === undefined ? '' : blogId !== -1
    const _url = url.replace(/\/archive\/.*\.html/, `/ajax/CategoriesTags.aspx`)
    const res = await axios.get(_url, { params: { postId, blogId } })
    const root = parse(res.data)
    const categories = root.querySelectorAll('#BlogPostCategory>a').map(i => i.innerText)
    const tags = root.querySelectorAll('#EntryTag>a').map(i => i.innerText)
    return { categories, tags, isPublished }
  } catch (error) {
    log.fail(url)
    log.fail(error)
  }
}

/**
 * Get detected programe language
 * @param content programe language content
 * @returns string
 */
const getDetectedLanguage = async (content) => {
  const modulOperations = new Languagedetection.ModelOperations()
  const result = await modulOperations.runModel(content)
  return result.length ? result[0].languageId : ''
}

/**
 * Format code path
 * @param {string} mdFile markdown string
 * @returns {Promise<string[]>}
 */
const getMdCode = async (mdFile) => {
  const matched = mdFile.match(CODE_REGEXP)

  if (matched) {
    const promises = []

    matched.forEach(item => promises.push(getDetectedLanguage(item)))

    if (!promises.filter((p) => p).length) return []

    const data = await Promise.all(promises)

    if (!data) return []

    return data
  }

  return []
}

/**
 * Detect the lang is existed in the the siki's languags
 * @param lang the programe language string
 * @returns boolean
 */
const hasLang = (lang) => BUNDLED_LANGUAGES.some(l => l.id === lang)

/**
 * Get the code formated content
 * @param content markdonw content
 * @returns string
 */
const getCodeFormatedContent = async (content) => {
  const codeLangs = await getMdCode(content)
  let codeIndex = 0

  return content.replace(CODE_REGEXP, (_, m1, m2) => {
    if (m1 && hasLang(m1)) return _
    const str = '```' + (hasLang(codeLangs[codeIndex]) ? codeLangs[codeIndex] : '') + m2 + '\n```'
    codeIndex++
    return str
  })
}

/**
 * Parse pre tag to markdown code sign
 * @param {string} content HTML DOM
 * @returns string
 */
const parsePreTagToCodeSign = (content) => {
  const turndownService = new TurndownService({ hr: '---' })
  turndownService.addRule('pre', {
    filter: 'pre',
    replacement: (_, node) => '```\n' + node.textContent + '\n```'
  })
  return turndownService.turndown(content)
}

/**
 * Get markdown content
 * @param {string} note 
 * @returns {Promise<string>}
 */
const getMdContent = (note) => {
  const content = CONTENT_REGEXP.exec(note)[1]
  const isHTML = HTML_CONTENT_REGEXP.test(note)
  return getCodeFormatedContent(isHTML ? parsePreTagToCodeSign(content) : content)
}

/**
 * Replace markdonw image path
 * @param {string} file markdwon file
 * @param {string} date public date
 * @returns {Promise<string>|undefined}
 */
const replaceMdImagePath = async (file, date) => {
  const imgObj = await getMdImgMap(file, date)

  if (imgObj) {
    return file.replace(new RegExp(IMAGE_REGEXP, 'gi'), (str, m) => `${m}(${imgObj[str]})`)
  }

  return file
}

const run = async () => {
  if (!notes) return log.fail('Input error!')

  await Promise.all(
    notes.map(async note => {
      const title = TITLE_REGEXP.exec(note)[1].trim()
      const fileName = title.replace(FILENAME_REGEXP, '')
      const safeTitle = getSafeTitle(title)
      const author = auth || AUTHOR_REGEXP.exec(note)[1]
      const link = LINK_REGEXP.exec(note)[1]
      const others = await getCategoriesTags(link)

      log.loading(title)

      const pubDate = DATE_REGEXP.exec(note)[1]
      const content = await getMdContent(note)
      const date = getDate(pubDate)
      const mdDir = md.replace(DIR_REGEXP, (_, m) => dayjs(pubDate).format(m))
      const mdFile = await replaceMdImagePath(getTemplateContent({ title, safeTitle, author, date, content, ...others }), pubDate)
      const outputDir = path.resolve(cwd, mdDir, fileName + '.md')

      await outputFile(outputDir, mdFile).then(() => log.succeed(outputDir)).catch(log.fail)
    })
  )

  log.succeed('All done!')
  log.stop()
}

run()
