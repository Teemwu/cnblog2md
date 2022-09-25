#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_extra_1 = require("fs-extra");
const html_to_md_1 = __importDefault(require("html-to-md"));
const commander_1 = require("commander");
const dayjs_1 = __importDefault(require("dayjs"));
const handlebars_1 = require("handlebars");
const chalk_1 = __importDefault(require("chalk"));
const axios_1 = __importDefault(require("axios"));
const ora_1 = __importDefault(require("ora"));
const dist_1 = require("node-html-parser/dist");
const cwd = process.cwd();
const resolve = (dir) => path_1.default.resolve(cwd, dir);
axios_1.default.defaults.timeout = 2e4;
/* --------------------------------- Command -------------------------------- */
commander_1.program
    .requiredOption('-f --file <string>', 'cnblog backup xml file path')
    .option('-m --md <string>', 'output markdown file path', cwd)
    .option('-i --img <string>', 'output image path', cwd)
    .option('-mi --mdimg <string>', 'markdown image path')
    .version('0.0.1', '-v, --version', 'output the current version')
    .parse();
/* -------------------------------- Constants ------------------------------- */
const TEMPLATE_APTH = './md-template.hbs';
const ENCODING = 'utf-8';
const TITLE_DATE_FORMATTER = 'YYYY/MM/DD HH:mm';
const IMAGE_DATE_FORMATTER = 'YYYYMMDDHHmm';
const LOADING_TIPS = '[LOADING]';
const SUCCEED_TIPS = '[SUCCEED]';
const FAILED_TIPS = '[FAILED]';
const INFO_TIPS = '[INFO]';
const NOTE_REGEXP = /<item(([\s\S])*?)<\/item>/;
const TITLE_REGEXP = /<title>([\s\S]*?)<\/title>/;
const DATE_REGEXP = /<pubDate(([\s\S])*?)<\/pubDate>/;
const CONTENT_REGEXP = /<!\[CDATA\[(([\s\S])*?)]]>/;
const HTML_CONTENT_REGEXP = /<!\[CDATA\[<[a-z]{1,}/;
const IMAGE_REGEXP = /(?<alt>!\[[^\]]*\])\((?<filename>.*?)(?=\"|\))\)/;
const DIR_REGEXP = /\{\{([a-z]{1,})\}\}/gi;
const BLOGID_REGEXP = /currentBlogId = ([0-9]{1,})\;/;
const LINK_REGEXP = /<link>(([\s\S])*?)<\/link>/;
const spinner = (0, ora_1.default)('Start to convert...').start();
const log = {
    info: (msg) => spinner.info(`${chalk_1.default.white(INFO_TIPS)} ${chalk_1.default.gray(msg)}`),
    loading: (msg) => spinner.start(`${chalk_1.default.blue(LOADING_TIPS)} ${chalk_1.default.gray(msg)}`),
    succeed: (msg) => spinner.succeed(`${chalk_1.default.green(SUCCEED_TIPS)} ${chalk_1.default.gray(msg)}`),
    fail: (msg) => spinner.fail(`${chalk_1.default.red(FAILED_TIPS)} ${chalk_1.default.gray(msg)}`)
};
const { file, img, md, mdimg } = commander_1.program.opts();
const xml = (0, fs_extra_1.readFileSync)(resolve(file), { encoding: ENCODING });
const notes = xml.match(new RegExp(NOTE_REGEXP, 'g'));
const template = (0, handlebars_1.compile)((0, fs_extra_1.readFileSync)(TEMPLATE_APTH, { encoding: ENCODING }), { noEscape: true });
/**
 * Load note images
 * @param {string} item markdown image block
 * @param {string} date nonte post date
 * @param {number} index image index
 * @returns {Promise<string[]>}
 */
const loadImage = (item, date, index) => __awaiter(void 0, void 0, void 0, function* () {
    const url = IMAGE_REGEXP.exec(item)[2];
    try {
        const res = yield axios_1.default.get(url, { responseType: 'arraybuffer' });
        if (!res || !res.data) {
            log.fail('Cannot to load image!');
            return [item, url];
        }
        const format = (tpl) => (0, dayjs_1.default)(date).format(tpl);
        const ext = '.' + url.split('.').pop();
        const dir = img.replace(DIR_REGEXP, (_, m) => format(m));
        const mdImgDir = mdimg ? mdimg.replace(DIR_REGEXP, (_, m) => format(m)) : dir;
        const fileName = format(IMAGE_DATE_FORMATTER) + index + ext;
        const outputImgDir = path_1.default.resolve(cwd, dir, fileName);
        yield (0, fs_extra_1.outputFile)(outputImgDir, res.data);
        return [item, path_1.default.resolve(mdImgDir, fileName).replace(cwd, '')];
    }
    catch (error) {
        log.fail(error);
        log.fail(url);
        return [item, url];
    }
});
/**
 * Format image path
 * @param {string} mdFile markdown string
 * @param {string} date public date string
 * @returns {Promise<{[key:string]:string}>}
 */
const getMdImgMap = (mdFile, date) => __awaiter(void 0, void 0, void 0, function* () {
    const matched = mdFile.match(new RegExp(IMAGE_REGEXP, 'gi'));
    if (matched) {
        const promises = [];
        matched.forEach((item, index) => promises.push(loadImage(item, date, index)));
        if (!promises.filter((p) => p).length)
            return null;
        const data = yield Promise.all(promises);
        if (!data)
            return null;
        const entries = new Map(data);
        return Object.fromEntries(entries);
    }
    return null;
});
const getBlogId = (url) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const res = yield axios_1.default.get(url);
        return parseInt(BLOGID_REGEXP.exec(res.data)[1], 10);
    }
    catch (error) {
        if (error.response.status === 404)
            return -1;
        log.fail(error);
        return undefined;
    }
});
const getCategoriesTags = (url) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const postId = url.split('/').pop().replace('.html', '');
        const blogId = yield getBlogId(url);
        const isPublished = blogId === undefined ? '' : blogId !== -1;
        const _url = url.replace(/\/archive\/.*\.html/, `/ajax/CategoriesTags.aspx`);
        const res = yield axios_1.default.get(_url, { params: { postId, blogId } });
        const root = (0, dist_1.parse)(res.data);
        const categories = root.querySelectorAll('#BlogPostCategory>a').map(i => i.innerText);
        const tags = root.querySelectorAll('#EntryTag>a').map(i => i.innerText);
        return { categories, tags, isPublished };
    }
    catch (error) {
        log.fail(url);
        log.fail(error);
    }
});
const run = () => __awaiter(void 0, void 0, void 0, function* () {
    if (!notes)
        return log.fail('Input error!');
    yield Promise.all(notes.map((note) => __awaiter(void 0, void 0, void 0, function* () {
        // Replace slash by unicode
        const title = TITLE_REGEXP.exec(note)[1].replace(/\//g, 'U+2215');
        const link = LINK_REGEXP.exec(note)[1];
        const others = yield getCategoriesTags(link);
        log.loading(title);
        const pubDate = DATE_REGEXP.exec(note)[1];
        const _content = CONTENT_REGEXP.exec(note)[1];
        const content = HTML_CONTENT_REGEXP.test(_content) ? (0, html_to_md_1.default)(_content) : _content;
        const date = (0, dayjs_1.default)(pubDate).format(TITLE_DATE_FORMATTER);
        const mdDir = md.replace(DIR_REGEXP, (_, m) => (0, dayjs_1.default)(pubDate).format(m));
        let mdFile = template(Object.assign({ title, date, content }, others));
        const imgObj = yield getMdImgMap(mdFile, pubDate);
        if (imgObj) {
            mdFile = mdFile.replace(new RegExp(IMAGE_REGEXP, 'gi'), (str, m) => `${m}(${imgObj[str]})`);
        }
        const outputDir = path_1.default.resolve(cwd, mdDir, title + '.md');
        yield (0, fs_extra_1.outputFile)(outputDir, mdFile)
            .then(() => log.succeed(outputDir))
            .catch(log.fail);
    })));
    log.succeed('All done!');
    spinner.stop();
});
run();
