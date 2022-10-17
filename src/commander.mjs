import { program } from 'commander'
import { version, cwd } from './utils.mjs'

program
	.requiredOption('-f --file <string>', 'cnblog backup xml file path')
	.option('-m --md <string>', 'output markdown file path', cwd)
	.option('-i --img <string>', 'output image path', cwd)
	.option('-mi --mdimg <string>', 'markdown image path')
	.option('-a --auth <string>', 'define the author')
	.version(version, '-v, --version', 'output the current version')
	.parse()

export default program.opts()