const fs = require('fs-extra')
const _ = require('lodash')
const log = require ('ololog').configure({})
const config = require('./config')
require('ansicolor').nice
const { GoogleSpreadsheet } = require('google-spreadsheet');

;(async() => {
    const doc = new GoogleSpreadsheet(config.sheetId);

    await doc.useServiceAccountAuth(require(config.authFile));
    await doc.loadInfo(); // loads document properties and worksheets
    const sheet = doc.sheetsByIndex[0]; // or use doc.sheetsById[id]
    await sheet.loadHeaderRow()

    const rows = _.map(
        await sheet.getRows(),
        r => _.pick(
            Object.assign(
                {},
                r,
                {
                    'Codex': `https://codex.wordpress.org/Function_Reference/${r.Function}`,
                    'DevHub': `https://developer.wordpress.org/reference/functions/${r.Function}`,
                }
            ),
            sheet.headerValues
        )
    )

    await fs.ensureDir(__dirname + '/data')
    fs.writeFileSync(__dirname + '/data/functions.json', JSON.stringify(rows, null, 4))
})()
