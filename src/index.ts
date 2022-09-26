'use strict'

import path from 'path'
import { readFileSync, outputFile, pathExistsSync } from 'fs-extra'
import html2md from 'html-to-md'
import { program } from 'commander'
import dayjs from 'dayjs'
import { compile } from 'handlebars'
import chalk from 'chalk'
import axios from 'axios'
import ora from 'ora'
import { parse } from 'node-html-parser/dist'

const pkg = require('../package.json')
const cwd = process.cwd()
const resolve = (dir: string) => path.resolve(cwd, dir)

axios.defaults.timeout = 2e4

/* --------------------------------- Command -------------------------------- */
program
	.requiredOption('-f --file <string>', 'cnblog backup xml file path')
	.option('-m --md <string>', 'output markdown file path', cwd)
	.option('-i --img <string>', 'output image path', cwd)
	.option('-mi --mdimg <string>', 'markdown image path')
	.option('-a --auth <string>', 'define the author')
	.version(pkg.version, '-v, --version', 'output the current version')
	.parse()

/* -------------------------------- Constants ------------------------------- */
const TEMPLATE_PATH = '../template/md-template.hbs'
const USER_TEMPLATE_1 = 'cnb-template.hbs'
const USER_TEMPLATE_2 = 'cnb-template.handlebars'
const ENCODING = 'utf-8'
const TITLE_DATE_FORMATTER = 'YYYY/MM/DD HH:mm'
const IMAGE_DATE_FORMATTER = 'YYYYMMDDHHmm'
const LOADING_TIPS = '[LOADING]'
const SUCCEED_TIPS = '[SUCCEED]'
const FAILED_TIPS = '[FAILED]'
const INFO_TIPS = '[INFO]'
const NOTE_REGEXP = /<item(([\s\S])*?)<\/item>/
const TITLE_REGEXP = /<title>([\s\S]*?)<\/title>/
const AUTHOR_REGEXP = /<author>([\s\S]*?)<\/author>/
const DATE_REGEXP = /<pubDate(([\s\S])*?)<\/pubDate>/
const CONTENT_REGEXP = /<!\[CDATA\[(([\s\S])*?)]]>/
const HTML_CONTENT_REGEXP = /<!\[CDATA\[<[a-z]{1,}/
const IMAGE_REGEXP = /(?<alt>!\[[^\]]*\])\((?<filename>.*?)(?=\"|\))\)/
const DIR_REGEXP = /\{\{([a-z]{1,})\}\}/gi
const BLOGID_REGEXP = /currentBlogId = ([0-9]{1,})\;/
const LINK_REGEXP = /<link>(([\s\S])*?)<\/link>/

const spinner = ora('Start to convert...').start()

const log = {
	info: (msg: string) => spinner.info(`${chalk.white(INFO_TIPS)} ${chalk.gray(msg)}`),
	loading: (msg: string) => spinner.start(`${chalk.blue(LOADING_TIPS)} ${chalk.gray(msg)}`),
	succeed: (msg: string) => spinner.succeed(`${chalk.green(SUCCEED_TIPS)} ${chalk.gray(msg)}`),
	fail: (msg: string) => spinner.fail(`${chalk.red(FAILED_TIPS)} ${chalk.gray(msg)}`)
}

const { file, img, md, mdimg, auth } = program.opts()
const xml = readFileSync(resolve(file), { encoding: ENCODING })
const notes = xml.match(new RegExp(NOTE_REGEXP, 'g'))

let template: any = ''
const _compile = (name: string) => compile(readFileSync(name, { encoding: ENCODING }), { noEscape: true })

if (pathExistsSync(resolve(USER_TEMPLATE_1))) {
	template = _compile(resolve(USER_TEMPLATE_1))
} else if (pathExistsSync(resolve(USER_TEMPLATE_2))) {
	template = _compile(resolve(USER_TEMPLATE_2))
} else {
	template = _compile(path.resolve(__dirname, TEMPLATE_PATH))
}

/**
 * Load note images
 * @param {string} item markdown image block
 * @param {string} date nonte post date
 * @param {number} index image index
 * @returns {Promise<string[]>}
 */
const loadImage = async (item: string, date: string, index: number): Promise<string[] | undefined> => {
	const url = IMAGE_REGEXP.exec(item)![2]

	try {
		const res = await axios.get(url, { responseType: 'arraybuffer' })

		if (!res || !res.data) {
			log.fail('Cannot to load image!')
			return [item, url]
		}

		const format = (tpl: string) => dayjs(date).format(tpl)
		const ext = '.' + url.split('.').pop()
		const dir = img.replace(DIR_REGEXP, (_: any, m: string) => format(m))
		const mdImgDir = mdimg ? mdimg.replace(DIR_REGEXP, (_: string, m: string) => format(m)) : dir
		const fileName = format(IMAGE_DATE_FORMATTER) + index + ext
		const outputImgDir = path.resolve(cwd, dir, fileName)

		await outputFile(outputImgDir, res.data)

		return [item, path.resolve(mdImgDir, fileName).replace(cwd, '')]
	} catch (error) {
		log.fail(error as string)
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
const getMdImgMap = async (mdFile: string, date: string): Promise<{ [key: string]: string } | null> => {
	const matched = mdFile.match(new RegExp(IMAGE_REGEXP, 'gi'))

	if (matched) {
		const promises: any = []

		matched.forEach((item, index) => promises.push(loadImage(item, date, index)))

		if (!promises.filter((p: any) => p).length) return null

		const data = await Promise.all(promises)

		if (!data) return null

		const entries = new Map(data)

		return Object.fromEntries(entries)
	}

	return null
}

const getBlogId = async (url: string) => {
	try {
		const res = await axios.get(url)
		return parseInt(BLOGID_REGEXP.exec(res.data)![1], 10)
	} catch (error) {
		if (error.response.status === 404) return -1
		log.fail(error)
		return undefined
	}
}

const getCategoriesTags = async (url: string) => {
	try {
		const postId = url.split('/').pop()!.replace('.html', '')
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

const run = async () => {
	if (!notes) return log.fail('Input error!')

	await Promise.all(notes.map(async note => {
		// Replace slash by unicode
		const title = TITLE_REGEXP.exec(note)![1].replace(/\//g, 'U+2215')
		const author = auth || AUTHOR_REGEXP.exec(note)![1]
		const link = LINK_REGEXP.exec(note)![1]
		const others = await getCategoriesTags(link)

		log.loading(title)

		const pubDate = DATE_REGEXP.exec(note)![1]
		const _content = CONTENT_REGEXP.exec(note)![1]
		const isHTML = HTML_CONTENT_REGEXP.test(note)
		const content = isHTML ? html2md(_content) : _content
		const date = dayjs(pubDate).format(TITLE_DATE_FORMATTER)
		const mdDir = md.replace(DIR_REGEXP, (_: string, m: string) => dayjs(pubDate).format(m))
		let mdFile = template({ title, author, date, content, ...others })
		const imgObj = await getMdImgMap(mdFile, pubDate)

		if (imgObj) {
			mdFile = mdFile.replace(new RegExp(IMAGE_REGEXP, 'gi'), (str, m) => `${m}(${imgObj[str]})`)
		}

		const outputDir = path.resolve(cwd, mdDir, title + '.md')

		await outputFile(outputDir, mdFile)
			.then(() => log.succeed(outputDir))
			.catch(log.fail)

	}))

	log.succeed('All done!')

	spinner.stop()
}

run()
