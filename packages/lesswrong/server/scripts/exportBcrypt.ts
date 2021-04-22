import { wrapVulcanAsyncScript } from './utils'
import { Vulcan } from '../vulcan-lib'
import Users from '../../lib/collections/users/collection'
import fs from 'mz/fs'
import Papa from 'papaparse'
import * as _ from 'underscore';

Vulcan.exportBcrypt = wrapVulcanAsyncScript(
  'exportBcrypt',
  async ({outputFile}) => {
    const fields = {'email': 1, 'services.password.bcrypt': 1, slug: 1, emails: 1, createdAt: 1, 'legacyData.password': 1}
    const users = await Users.find({}, {fields}).fetch()
    const failures: DbUser[] = []
    let c = 0
    const rows: {email: string, bcrypt: string}[] = []
    for (const user of users) {
      let email = user.email || user.emails?.[0]?.address
      let legacyPassword = false
      let password = user.services?.password?.bcrypt
      let shouldThrow = false
      // @ts-ignore -- legacyData isn't really handled right in our schemas.
      if (!password && user.legacyData?.password) {
        // @ts-ignore
        password = user.legacyData.password
        legacyPassword = true
      }
      if (!email || !password) {
        // legacy detritus, continue
        failures.push(user)
        continue
      }
      const row = {
        email: email,
        bcrypt: user.services?.password?.bcrypt,
        legacyPassword
      }
      rows.push(row)
      c++
      if (shouldThrow) throw Error('meh')
      //eslint-disable-next-line no-console
      if (c % 1000 === 0) console.log(`Processed ${c}/${users.length} users (${Math.round(c / users.length * 100)}%)`)
    }
    const csvFile = Papa.unparse(rows)
    await fs.writeFile(outputFile, csvFile)
    //eslint-disable-next-line no-console
    console.log(`Wrote details for ${rows.length} users to ${outputFile}`)
  }
)
