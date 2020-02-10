const fs = require('fs')
const _ = require('lodash')
const cheerio = require('cheerio')
const ololog = require ('ololog')
const log = require ('ololog').configure({})
const config = require('./config')
require ('ansicolor').nice
const { GoogleSpreadsheet } = require('google-spreadsheet');

;(async() => {
	let funcs = JSON.parse(fs.readFileSync(__dirname + '/data/functions-cross-checked.json'))

	const doc = new GoogleSpreadsheet(config.sheetId);

	await doc.useServiceAccountAuth(require(config.authFile));

	await doc.loadInfo(); // loads document properties and worksheets
	
	const sheet = doc.sheetsByIndex[0]; // or use doc.sheetsById[id]

	await sheet.loadHeaderRow()

	const rows = await sheet.getRows(); // can pass in { limit, offset }

	await sheet.loadCells({
		// endRowIndex: 200
	})

	let crossCheckIndex = sheet.headerValues.indexOf('Cross-check'),
		statusCellIndex = sheet.headerValues.indexOf('Status')

	if (crossCheckIndex === -1) {
		log('Cannot find crossCheckIndex')
		return
	}

	if (statusCellIndex === -1) {
		log('Cannot find statusCellIndex')
		return
	}

	log(`Cells loaded`.yellow)
	
	for (let row of rows) {
		let cell = await sheet.getCell(row.rowIndex - 1, crossCheckIndex),
			statusCell = await sheet.getCell(row.rowIndex - 1, statusCellIndex),
			f = _.find(funcs, { Function: row.Function }),
			crossCheckUpdate = null,
			statusUpdate = null

		if (!_.isNil(f.actuallyRedirected) && f.actuallyRedirected) {
			// crossCheckUpdate = 'ACTUALLY_REDIRECTED'
			crossCheckUpdate = 'OK'
			statusUpdate = 'Done'
		} else if (!_.isNil(f.actuallyNotRedirected) && f.actuallyNotRedirected) {
			crossCheckUpdate = 'NOT_REDIRECTED'

			if (row.Status == 'Done') {
				statusUpdate = 'Waiting'
			}
		} else if (row.Status != 'Done' && !_.isNil(f.tracIssueFixed) && f.tracIssueFixed) {
			crossCheckUpdate = 'TRAC_ISSUE_FIXED'
		} else {
			crossCheckUpdate = 'OK'
		}

		if (!_.isNil(crossCheckUpdate) && cell.value != crossCheckUpdate) {
			cell.value = crossCheckUpdate
		}

		if (!_.isNil(statusUpdate) && statusCell.value != statusUpdate) {
			statusCell.value = statusUpdate
		}
	}

	await sheet.saveUpdatedCells(); // save all updates in one call
})()