import ora from 'ora'
import chalk from 'chalk'
import { INFO_TIPS, LOADING_TIPS, SUCCEED_TIPS, FAILED_TIPS } from './constants.mjs'

const { gray, white, blue, green, red } = chalk

export default class Log {

	constructor() {
		this.spinner = ora('Start to convert...').start()
	}

	info(msg) {
		this.spinner.info(`${white(INFO_TIPS)} ${gray(msg)}`)
	}

	loading(msg) {
		this.spinner.start(`${blue(LOADING_TIPS)} ${gray(msg)}`)
	}

	succeed(msg) {
		this.spinner.succeed(`${green(SUCCEED_TIPS)} ${gray(msg)}`)
	}

	fail(msg) {
		this.spinner.fail(`${red(FAILED_TIPS)} ${gray(msg)}`)
	}

	stop() {
		this.spinner.stop()
	}

}
