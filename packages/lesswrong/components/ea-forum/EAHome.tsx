import React from 'react'
import { AnalyticsContext } from '../../lib/analyticsEvents'
import { userHasEAHomeHandbook } from '../../lib/betas'
import { PublicInstanceSetting } from '../../lib/instanceSettings'
import { DatabasePublicSetting } from '../../lib/publicSettings'
import { Components, registerComponent } from '../../lib/vulcan-lib'
import { useCurrentUser } from '../common/withUser'

const eaHomeSequenceIdSetting = new PublicInstanceSetting<string | null>('eaHomeSequenceId', null, "optional") // Sequence ID for the EAHomeHandbook sequence
const showSmallpoxSetting = new DatabasePublicSetting<boolean>('showSmallpox', false)
const showHandbookBannerSetting = new DatabasePublicSetting<boolean>('showHandbookBanner', false)
const showTagProgressBarSetting = new DatabasePublicSetting<boolean>('showTagProgressBar', false)

const EAHome = () => {
  const currentUser = useCurrentUser();
  const {
    RecentDiscussionFeed, HomeLatestPosts, EAHomeHandbook, RecommendationsAndCurated,
    SmallpoxBanner, TagProgressBar
  } = Components

  const recentDiscussionCommentsPerPost = (currentUser && currentUser.isAdmin) ? 4 : 3;
  const shouldRenderEAHomeHandbook = showHandbookBannerSetting.get() && userHasEAHomeHandbook(currentUser)
  const shouldRenderSmallpox = showSmallpoxSetting.get()
  const shouldRenderTagProgressBar = showTagProgressBarSetting.get()
  console.log('🚀 ~ file: EAHome.tsx ~ line 24 ~ EAHome ~ shouldRenderTagProgressBar', shouldRenderTagProgressBar)

  return (
    <React.Fragment>
      {shouldRenderEAHomeHandbook && <EAHomeHandbook documentId={eaHomeSequenceIdSetting.get()}/>}
      
      {shouldRenderSmallpox && <SmallpoxBanner/>}
      {shouldRenderTagProgressBar && !currentUser?.hideTaggingProgressBar && <AnalyticsContext pageSectionContext="Tag Progress Bar">
        <TagProgressBar/>
      </AnalyticsContext>}

      <HomeLatestPosts />

      <RecommendationsAndCurated configName="frontpageEA" />
      <RecentDiscussionFeed
        af={false}
        commentsLimit={recentDiscussionCommentsPerPost}
        maxAgeHours={18}
      />
    </React.Fragment>
  )
}

const EAHomeComponent = registerComponent('EAHome', EAHome)

declare global {
  interface ComponentTypes {
    EAHome: typeof EAHomeComponent
  }
}
