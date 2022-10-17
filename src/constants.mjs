export const TEMPLATE_PATH = '../template/md-template.hbs'
export const USER_TEMPLATE_1 = 'cnb-template.hbs'
export const USER_TEMPLATE_2 = 'cnb-template.handlebars'

export const ENCODING = 'utf-8'

export const TITLE_DATE_FORMATTER = 'YYYY/MM/DD HH:mm'
export const IMAGE_DATE_FORMATTER = 'YYYYMMDDHHmm'

export const LOADING_TIPS = '[LOADING]'
export const SUCCEED_TIPS = '[SUCCEED]'
export const FAILED_TIPS = '[FAILED]'
export const INFO_TIPS = '[INFO]'

export const NOTE_REGEXP = /<item(([\s\S])*?)<\/item>/
export const TITLE_REGEXP = /<title>([\s\S]*?)<\/title>/
export const AUTHOR_REGEXP = /<author>([\s\S]*?)<\/author>/
export const DATE_REGEXP = /<pubDate(([\s\S])*?)<\/pubDate>/
export const CONTENT_REGEXP = /<!\[CDATA\[(([\s\S])*?)]]>/
export const HTML_CONTENT_REGEXP = /<!\[CDATA\[<[a-z]{1,}/
export const IMAGE_REGEXP = /(?<alt>!\[[^\]]*\])\((?<filename>.*?)(?=\"|\))\)/
export const DIR_REGEXP = /\{\{([a-z]{1,})\}\}/gi
export const BLOGID_REGEXP = /currentBlogId = ([0-9]{1,})\;/
export const LINK_REGEXP = /<link>(([\s\S])*?)<\/link>/
export const CODE_REGEXP = /\`\`\`([a-z]{0,})([\s\S]*?)\`\`\`/gi
export const FILENAME_REGEXP = /('|"|\/|\\|<|>|:|\?|\*|&amp;|\`|\+|,)/g
