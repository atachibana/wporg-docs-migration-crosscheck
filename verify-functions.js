const fs = require('fs')
const _ = require('lodash')
const cheerio = require('cheerio')
const rp = require('request-promise')
const log = require('ololog').configure({})
const throat = require('throat')
const csv = require('csv-parse/lib/sync')
require ('ansicolor').nice

async function redirectCheck(f, counts) {
	return new Promise((async(resolve) => {
		try {
			let resp = await rp({
				method: 'HEAD',
				uri: f.Codex,
				resolveWithFullResponse: true,
				followRedirect: false,
				simple: false,
				gzip: true
			})

			log(`Check ${f.Codex}`.yellow)

			if (f.Status !== 'Done') {
				if (!_.isNil(resp.headers.location)) {
					f.actuallyRedirected = true
					counts.redirected++

				} else if (!_.isNil(f.Notes) && f.Notes.indexOf('trac.wordpress') !== -1) {
					const regex = /(https:\/\/core\.trac\.wordpress\.org\/ticket\/\d+)/gm;
					const tracUrl = regex.exec(f.Notes)[0] + '?format=csv'

					try {
						let trac = await rp({ uri: tracUrl }),
							tracStatus = csv(trac, {
								columns: true,
							  	skip_empty_lines: true
							})

						log(`Checked Trac at ${tracUrl}, found status`, tracStatus[0].status.yellow)

						if (!_.isNil(tracStatus) && (tracStatus[0].status == 'fixed' || tracStatus[0].status == 'closed')) {
							f.tracIssueFixed = true
						}
					} catch (e) {
						log(`Failed to fetch Trac status`.red, e)
					}
				}
			} else if (f.Status === 'Done' && _.isNil(resp.headers.location)) {
				let fullResp = await rp({
					method: 'GET',
					uri: f.Codex,
					gzip: true
				})

				if (fullResp.indexOf('This page was moved to') === -1 && fullResp.indexOf('above language locator') === -1) {
					f.actuallyNotRedirected = true
					counts.notReallyRedirected++
				} else {
					f.hasLanguageLocator = true
				}
			}
		} catch (e) {
			log(e)
		}

		resolve(f)
	}))
}

async function tracCheck(f, counts) {
	return new Promise((async(resolve) => {
		log(f.Function.green, f.Status)

		try {
			let resp = await rp({
				method: 'HEAD',
				uri: f.Codex,
				resolveWithFullResponse: true,
				followRedirect: false,
				simple: false,
				gzip: true
			})

			if (!_.isNil(resp.headers.location) && f.Status != 'Done') {
				f.actuallyRedirected = true
				counts.redirected++

				log(`Count = ${counts.redirected}`.red, f.Codex)
			}
		} catch (e) {
			log(e)
		}

		resolve(f)
	}))
}

;(async() => {
	let funcs = JSON.parse(fs.readFileSync(__dirname + '/data/functions.json')),
		counts = { redirected: 0, tracFixed: 0, notReallyRedirected: 0 },
		redirectChecks = [],
		tracChecks = [],
		tracFuncs = _.filter(funcs, f => f.Status != 'Done' && !_.isNil(f.Notes) && f.Notes.indexOf('trac') !== -1)

	funcs = await Promise.all(funcs.map(throat(10, f => redirectCheck(f, counts))))

	fs.writeFileSync(__dirname + '/data/functions-cross-checked.json', JSON.stringify(funcs, null, 4))
})()