/* eslint-disable import/first */
require('dotenv').config()

import asyncRetry from 'async-retry'
import buildExtensions from './tasks/build-extensions'
import { copyEntries } from './tasks/copy-entries'
import {
  createCypressConfiguration,
  createExtensionConfiguration,
} from './tasks/create-configuration-files'
import createEnvironment from './tasks/create-new-environment'
import deleteEnvironment from './tasks/delete-new-environment'
import deleteStaleEnvironments from './tasks/delete-stale-environments'
import deployExtensions from './tasks/deploy-extensions'
import runCypress from './tasks/run-cypress'
import idsData from '../cypress/integration/fixtures/ids-data.json'

const config = {
  managementTokenAdmin: process.env.CONTENTFUL_CMA_TOKEN!,
  managementTokenEditor: process.env.CONTENTFUL_CMA_TOKEN_EDITOR!,
  managementTokenEditorMasterOnly: process.env.CONTENTFUL_CMA_TOKEN_EDITOR_MASTER_ONLY!,
  spaceId: process.env.CONTENTFUL_SPACE_ID!,
  baseUrl: process.env.CONTENTFUL_APP!,
  testLocalSdk: process.env.TEST_LOCAL_SDK === 'true',
}

const entryIds = {
  entryEditorExtension: idsData.entryEditorExtension.entry,
  fieldExtension: idsData.fieldExtension.entry,
  sidebarExtension: idsData.sidebarExtension.entry,
  onValueChanged: idsData.onValueChanged.entry,
}

function listAllEnvironmentVariables() {
  ;['CONTENTFUL_SPACE_ID', 'CYPRESS_baseUrl', 'TEST_LOCAL_SDK'].forEach((envvar) => {
    console.log(`${envvar}=${process.env[envvar]}`)
  })
  ;[
    'CONTENTFUL_CMA_TOKEN',
    'CONTENTFUL_CMA_TOKEN_EDITOR',
    'CONTENTFUL_CMA_TOKEN_EDITOR_MASTER_ONLY',
  ].forEach((envvar) => {
    console.log(`${envvar}=${(process.env[envvar] || '').slice(0, 5)}...`)
  })
}

let environmentId: any

const cleanup = async () => {
  if (environmentId) {
    try {
      await asyncRetry(() => deleteEnvironment(environmentId), { retries: 3 })
    } catch (e) {
      console.log(e)
      throw new Error('Failed to remove environment')
    }
  }
}

const run = async () => {
  await buildExtensions({
    testLocalSdk: config.testLocalSdk,
  })

  listAllEnvironmentVariables()

  try {
    await deleteStaleEnvironments()
  } catch (e) {
    console.error('Could not delete all stale environments')
  }

  try {
    environmentId = await asyncRetry(
      () => {
        return createEnvironment()
      },
      { retries: 3 }
    )
  } catch (e) {
    console.log(e)
    throw new Error('Failed to create a new environment')
  }

  createExtensionConfiguration({
    managementToken: config.managementTokenAdmin,
    spaceId: config.spaceId,
    environmentId,
  })
  await deployExtensions()

  // Admin
  // await createCypressConfiguration({
  //   managementToken: config.managementTokenAdmin,
  //   spaceId: config.spaceId,
  //   environmentId,
  //   role: 'admin',
  //   entries: entryIds,
  // })
  // await runCypress()

  // Editor
  // await createCypressConfiguration({
  //   managementToken: config.managementTokenEditor,
  //   spaceId: config.spaceId,
  //   environmentId,
  //   role: 'editor',
  //   entries: entryIds,
  // })
  // await runCypress()

  // Editor (master only)
  const newEntryIds = await copyEntries(entryIds)
  await createCypressConfiguration({
    managementToken: config.managementTokenEditorMasterOnly,
    spaceId: config.spaceId,
    environmentId: 'master-test',
    role: 'editorMasterOnly',
    entries: newEntryIds,
  })
  await runCypress()
}
;(async function main() {
  try {
    await run()
    await cleanup()
  } catch (err) {
    console.log(err)
    await cleanup()
    process.exit(1)
  }
})()
