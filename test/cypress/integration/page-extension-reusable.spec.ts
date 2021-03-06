import { pageExtension } from '../utils/paths'

import { openDialogExtensionTest } from './reusable/open-dialog-extension-test'
import { openEntryTest } from './reusable/open-entry-test'
import { openAssetTest } from './reusable/open-asset-test'
import { openSdkUserDataTest } from './reusable/open-sdk-user-data-test'
import { openSdkLocalesDataTest } from './reusable/open-sdk-locales-data-test'
import {
  openSuccessNotificationTest,
  openErrorNotificationTest
} from './reusable/open-notifications-test'

const iframeSelector = '[data-test-id="page-extension"] iframe'
const pageExtensionId = 'my-page-extension'

context('Page extension', () => {
  beforeEach(() => {
    cy.setupBrowserStorage()
    cy.visit(pageExtension('test-extension'))

    cy.findByTestId('page-extension').within(() => {
      cy.waitForIframeWithTestId(pageExtensionId)
      cy.get('iframe').captureIFrameAs('extension')
    })
  })

  /* Reusable tests */

  openDialogExtensionTest(iframeSelector)
  openEntryTest(iframeSelector)
  openAssetTest(iframeSelector)
  openSdkUserDataTest(iframeSelector)
  openSdkLocalesDataTest(iframeSelector)
  openSuccessNotificationTest(iframeSelector)
  openErrorNotificationTest(iframeSelector)
})
