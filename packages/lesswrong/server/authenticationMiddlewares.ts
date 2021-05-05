import passport, { Profile } from 'passport'
import { createAndSetToken } from './vulcan-lib/apollo-server/authentication';
import { Strategy as CustomStrategy, VerifiedCallback, VerifyCallback } from 'passport-custom'
import { getUser } from './vulcan-lib/apollo-server/context';
import { Users } from '../lib/collections/users/collection';
import { getCookieFromReq } from './utils/httpUtil';
import { Strategy as GoogleOAuthStrategy, Profile as GoogleProfile } from 'passport-google-oauth20';
import { Strategy as FacebookOAuthStrategy, Profile as FacebookProfile } from 'passport-facebook';
import { Strategy as GithubOAuthStrategy, Profile as GithubProfile } from 'passport-github2';
import { Strategy as Auth0Strategy, Profile as Auth0Profile, ExtraVerificationParams } from 'passport-auth0';
import { DatabaseServerSetting } from './databaseSettings';
import { createMutator } from './vulcan-lib/mutators';
import { getSiteUrl, slugify, Utils } from '../lib/vulcan-lib/utils';

// TODO; doc
declare global {
  // TODO;
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User extends DbUser {
    }
  }
}

const googleClientIdSetting = new DatabaseServerSetting('oAuth.google.clientId', null)
const googleOAuthSecretSetting = new DatabaseServerSetting('oAuth.google.secret', null)

const auth0ClientIdSetting = new DatabaseServerSetting('oAuth.auth0.appId', null)
const auth0OAuthSecretSetting = new DatabaseServerSetting('oAuth.auth0.secret', null)
const auth0DomainSetting = new DatabaseServerSetting('oAuth.auth0.domain', null)

const facebookClientIdSetting = new DatabaseServerSetting('oAuth.facebook.appId', null)
const facebookOAuthSecretSetting = new DatabaseServerSetting('oAuth.facebook.secret', null)

const githubClientIdSetting = new DatabaseServerSetting('oAuth.github.clientId', null)
const githubOAuthSecretSetting = new DatabaseServerSetting('oAuth.github.secret', null)

type IdFromProfile<P extends Profile> = (profile: P) => string
type UserDataFromProfile<P extends Profile> = (profile: P) => Promise<Partial<DbUser>>

// TODO; doc
function createOAuthUserHandler<P extends Profile>(idPath: string, getIdFromProfile: IdFromProfile<P>, getUserDataFromProfile: UserDataFromProfile<P>) {
  return async (_accessToken: string, _refreshToken: string, profile: P, done: VerifiedCallback) => {
    // console.log('idPath', idPath)
    // console.log('🚀 ~ file: authenticationMiddlewares.ts ~ line 40 ~ return ~ profile', profile)
    // console.log('profile.emails', profile.emails)
    // console.log('getIdFromProfile(profile)', getIdFromProfile(profile))
    const profileId = getIdFromProfile(profile)
    // Probably impossible, but if it is null, we just log the person in as a
    // random user, which is bad
    if (!profileId) {
      throw new Error('OAuth profile does not have a profile ID')
    }
    const user = await Users.findOne({[idPath]: profileId})
    if (!user) {
      console.log("In createOAuthUserHandler, creating a new user")
      // console.log('🚀 ~ file: authenticationMiddlewares.ts ~ line 60 ~ return ~ getUserDataFromProfile', getUserDataFromProfile)
      // console.log('user', user)
      const userToCreate = await getUserDataFromProfile(profile)
      // console.log('🚀 ~ file: authenticationMiddlewares.ts ~ line 59 ~ return ~ userToCreate', userToCreate)
      // console.log('🚀 ~ file: authenticationMiddlewares.ts ~ line 59 ~ return ~ userToCreate.json', userToCreate._json)
      const { data: userCreated } = await createMutator({
        collection: Users,
        document: userToCreate,
        validate: false,
        currentUser: null
      })
      // console.log('done creating new user')
      return done(null, userCreated)
    }
    console.log("In createOAuthUserHandler, a user already exists")
    return done(null, user)
  }
}

// TODO; doc
function createAuth0UserHandler(idPath: string, getIdFromProfile: IdFromProfile<Auth0Profile>, getUserDataFromProfile: UserDataFromProfile<Auth0Profile>) {
  const standardHandler = createOAuthUserHandler(idPath, getIdFromProfile, getUserDataFromProfile)
  return (accessToken: string, refreshToken: string, _extraParams: ExtraVerificationParams, profile: Auth0Profile, done: VerifyCallback) => {
    return standardHandler(accessToken, refreshToken, profile, done)
  }
}

const cookieAuthStrategy = new CustomStrategy(async function getUserPassport(req: any, done) {
  const loginToken = getCookieFromReq(req, 'loginToken') || getCookieFromReq(req, 'meteor_login_token') // Backwards compatibility with meteor_login_token here
  if (!loginToken) return done(null, false)
  const user = await getUser(loginToken)
  if (!user) return done(null, false)
  done(null, user)
})

async function deserializeUserPassport(id, done) {
  const user = await Users.findOne({_id: id})
  if (!user) done()
  done(null, user)
}

passport.serializeUser((user, done) => done(null, user._id))
passport.deserializeUser(deserializeUserPassport)


export const addAuthMiddlewares = (addConnectHandler) => {
  addConnectHandler(passport.initialize())
  addConnectHandler(passport.session())
  passport.use(cookieAuthStrategy)
  
  addConnectHandler('/', (req, res, next) => {
    passport.authenticate('custom', (err, user, info) => {
      if (err) return next(err)
      if (!user) return next()
      req.logIn(user, (err) => {
        if (err) return next(err)
        next()
      })
    })(req, res, next) 
  })

  addConnectHandler('/logout', (req, res, next) => {
    passport.authenticate('custom', (err, user, info) => {
      if (err) return next(err)
      if (!user) return next()
      req.logOut()

      // The accepted way to delete a cookie is to set an expiration date in the past.
      if (getCookieFromReq(req, "meteor_login_token")) {
        res.setHeader("Set-Cookie", `meteor_login_token= ; expires=${new Date(0).toUTCString()};`)
      }
      if (getCookieFromReq(req, "loginToken")) {
        res.setHeader("Set-Cookie", `loginToken= ; expires=${new Date(0).toUTCString()};`)
      }
      
      
      res.statusCode=302;
      res.setHeader('Location','/');
      return res.end();
    })(req, res, next);
  })

  const googleClientId =  googleClientIdSetting.get()
  const googleOAuthSecret = googleOAuthSecretSetting.get()
  if (googleClientId && googleOAuthSecret) {
    passport.use(new GoogleOAuthStrategy({
      clientID: googleClientId,
      clientSecret: googleOAuthSecret,
      callbackURL: `${getSiteUrl()}auth/google/callback`,
      proxy: true
    },
    createOAuthUserHandler<GoogleProfile>('services.google.id', profile => profile.id, async profile => ({
      email: profile.emails?.[0].value,
      services: {
        google: profile
      },
      emails: profile.emails,
      username: await Utils.getUnusedSlugByCollectionName("Users", slugify(profile.displayName)),
      displayName: profile.displayName,
      emailSubscribedToCurated: true
    }))
  ))}
  
  const facebookClientId = facebookClientIdSetting.get()
  const facebookOAuthSecret = facebookOAuthSecretSetting.get()
  if (facebookClientId && facebookOAuthSecret) {
    passport.use(new FacebookOAuthStrategy({
      clientID: facebookClientId,
      clientSecret: facebookOAuthSecret,
      callbackURL: `${getSiteUrl()}auth/facebook/callback`,
      profileFields: ['id', 'emails', 'name', 'displayName'],
    },
      createOAuthUserHandler<FacebookProfile>('services.facebook.id', profile => profile.id, async profile => ({
        email: profile.emails?.[0].value,
        services: {
          facebook: profile
        },
        username: await Utils.getUnusedSlugByCollectionName("Users", slugify(profile.displayName)),
        displayName: profile.displayName,
        emailSubscribedToCurated: true
      }))
    ))
  }

  const githubClientId = githubClientIdSetting.get()
  const githubOAuthSecret = githubOAuthSecretSetting.get()
  if (githubClientId && githubOAuthSecret) {
    passport.use(new GithubOAuthStrategy({
      clientID: githubClientId,
      clientSecret: githubOAuthSecret,
      callbackURL: `${getSiteUrl()}auth/github/callback`,
      scope: [ 'user:email' ], // fetches non-public emails as well
    },
      createOAuthUserHandler<GithubProfile>('services.github.id', profile => profile.id, async profile => ({
        email: profile.emails?.[0].value,
        services: {
          github: profile
        },
        username: await Utils.getUnusedSlugByCollectionName("Users", slugify(profile.username || profile.displayName)),
        displayName: profile.username || profile.displayName,
        emailSubscribedToCurated: true
      }))
    ));
  }

  const auth0ClientId = auth0ClientIdSetting.get();
  const auth0OAuthSecret = auth0OAuthSecretSetting.get()
  const auth0Domain = auth0DomainSetting.get()
  if (auth0ClientId && auth0OAuthSecret && auth0Domain) {
    passport.use(new Auth0Strategy(
      {
        clientID: auth0ClientId,
        clientSecret: auth0OAuthSecret,
        domain: auth0Domain,
        callbackURL: `${getSiteUrl()}auth/auth0/callback`,
      },
      createAuth0UserHandler('services.auth0.id', profile => profile.id, async profile => {
        delete profile._json
        return {
          email: profile.emails?.[0].value,
          services: {
            auth0: profile
          },
          username: await Utils.getUnusedSlugByCollectionName("Users", slugify(profile.displayName)),
          displayName: profile.displayName,
          emailSubscribedToCurated: true
        }
      })
    ));
  }

  addConnectHandler('/auth/google/callback', (req, res, next) => {
    passport.authenticate('google', {}, (err, user, info) => {
      if (err) return next(err)
      if (!user) return next()
      req.logIn(user, async (err) => {
        if (err) return next(err)
        await createAndSetToken(req, res, user)
        res.statusCode=302;
        res.setHeader('Location', '/')
        return res.end();
      })
    })(req, res, next)
  } )

  addConnectHandler('/auth/google', (req, res, next) => {
    passport.authenticate('google', {
      scope: [
        'https://www.googleapis.com/auth/plus.login',
          'https://www.googleapis.com/auth/userinfo.email'
      ], accessType: "offline", prompt: "consent"
    } as any)(req, res, next)
  })

  addConnectHandler('/auth/facebook/callback', (req, res, next) => {
    passport.authenticate('facebook', {}, (err, user, info) => {
      if (err) return next(err)
      if (!user) return next()
      req.logIn(user, async (err) => {
        if (err) return next(err)
        await createAndSetToken(req, res, user)
        res.statusCode=302;
        res.setHeader('Location', '/')
        return res.end();
      })
    })(req, res, next)
  } )

  addConnectHandler('/auth/facebook', (req, res, next) => {
    passport.authenticate('facebook')(req, res, next)
  })

  addConnectHandler('/auth/auth0/callback', (req, res, next) => {
    console.log('Starting passport auth...')
    passport.authenticate('auth0', (err, user, info) => {
      console.log("In passport.authenticate for auth0");
      if (err) {
        console.log(err);
        return next(err)
      }
      console.log('req.query:', req.query)
      console.log('user:', user)
      if (req.query?.error) {
        const { error, error_description} = req.query
        return next(new Error(`${error}: ${error_description}`))
      }
      if (!user) {
        console.log("No user")
        return next()
      }
      req.logIn(user, async (err) => {
        console.log("In req.logIn result callback")
        if (err) {
          console.log("req.logIn failed: ", err)
          return next(err)
        }
        await createAndSetToken(req, res, user)
        res.statusCode=302;
        res.setHeader('Location', '/')
        console.log("req.logIn finished");
        return res.end();
      })
    })(req, res, next)
  } )

  addConnectHandler('/auth/auth0', (req, res, next) => {
    passport.authenticate('auth0', { scope: 'profile email openid offline_access'})(req, res, next)
  })

  addConnectHandler('/auth/github/callback', (req, res, next) => {
    passport.authenticate('github', {}, (err, user, info) => {
      if (err) return next(err)
      if (!user) return next()
      req.logIn(user, async (err) => {
        if (err) return next(err)
        await createAndSetToken(req, res, user)
        res.statusCode=302;
        res.setHeader('Location', '/')
        return res.end();
      })
    })(req, res, next)
  } )

  addConnectHandler('/auth/github', (req, res, next) => {
    passport.authenticate('github', { scope: ['user:email']})(req, res, next)
  })
}
