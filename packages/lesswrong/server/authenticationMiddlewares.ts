import passport from 'passport'
import { createAndSetToken } from './vulcan-lib/apollo-server/authentication';
import { Strategy as CustomStrategy } from 'passport-custom'
import { getUser } from './vulcan-lib/apollo-server/context';
import { Users } from '../lib/collections/users/collection';
import { getCookieFromReq } from './utils/httpUtil';
import { Strategy as GoogleOAuthStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookOAuthStrategy } from 'passport-facebook';
import { Strategy as Auth0Strategy } from 'passport-auth0';
import { Strategy as GithubOAuthStrategy } from 'passport-github2';
import { DatabaseServerSetting } from './databaseSettings';
import { createMutator } from './vulcan-lib/mutators';
import { getSiteUrl, slugify, Utils } from '../lib/vulcan-lib/utils';
import jwt from 'jsonwebtoken'

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

// TODO replace this function for Auth0 and revert this to however it was originally written
function createOAuthUserHandler(idPath, getIdFromProfile, getUserDataFromProfile) {
  return async (accessToken, _refreshToken, _extraParams, profile, done) => {
    console.log('idPath', idPath)
    console.log('🚀 ~ file: authenticationMiddlewares.ts ~ line 40 ~ return ~ profile', profile)
    console.log('profile.emails', profile.emails)
    console.log('getIdFromProfile(profile)', getIdFromProfile(profile))
    // You'll need to get the secret from our public key
    // https://auth0.com/docs/tokens/json-web-tokens/json-web-key-sets/locate-json-web-key-sets
    // There's probably a library that'll do this for you
    //
    // We rely on the previous strategy code to verify the jwt. For some reason,
    // they don't pass us the decoded value, so we'll decode it ourselves, but
    // not verify it.
    // const auth0User = jwt.decode(profile.id_token)
    // TODO; this erroneously returns any (single) user if the profile ID is undefined
    const user = await Users.findOne({[idPath]: getIdFromProfile(profile)})
    if (!user) {
      console.log("In createOAuthUserHandler, creating a new user")
      console.log('🚀 ~ file: authenticationMiddlewares.ts ~ line 60 ~ return ~ getUserDataFromProfile', getUserDataFromProfile)
      console.log('user', user)
      const userToCreate = getUserDataFromProfile(profile)
      console.log('🚀 ~ file: authenticationMiddlewares.ts ~ line 59 ~ return ~ userToCreate', userToCreate)
      console.log('🚀 ~ file: authenticationMiddlewares.ts ~ line 59 ~ return ~ userToCreate.json', userToCreate._json)
      const { data: userCreated } = await createMutator({
        collection: Users,
        document: userToCreate,
        validate: false,
        currentUser: null
      })
      console.log('done creating new user')
      return done(null, userCreated)
    }
    console.log("In createOAuthUserHandler, a user already exists")
    return done(null, user)
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

// TODO: Passport annotates this a taking an Express.User, which doesn't have an _id.
// But this seems to work with this (and other functions) assuming a DbUser. Marked
// as 'any' to suppress the type error.
passport.serializeUser((user: any, done) => done(null, user._id))
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
    createOAuthUserHandler('services.google.id', profile => profile.id, profile => ({
      email: profile.emails[0].address,
      services: {
        google: profile
      },
      emails: profile.emails,
      username: Utils.getUnusedSlugByCollectionName("Users", slugify(profile.displayName)),
      displayName: profile.displayName,
      emailSubscribedToCurated: true
    }))
  ))}
  
  const facebookClientId = facebookClientIdSetting.get()
  if (facebookClientId) {
    passport.use(new FacebookOAuthStrategy({
      clientID: facebookClientId,
      clientSecret: facebookOAuthSecretSetting.get(),
      callbackURL: `${getSiteUrl()}auth/facebook/callback`,
      profileFields: ['id', 'emails', 'name', 'displayName'],
      proxy: true
    },
      createOAuthUserHandler('services.facebook.id', profile => profile.id, profile => ({
        email: profile.emails[0].value,
        services: {
          facebook: profile
        },
        username: Utils.getUnusedSlugByCollectionName("Users", slugify(profile.displayName)),
        displayName: profile.displayName,
        emailSubscribedToCurated: true
      }))
    ))
  }

  const auth0ClientId = auth0ClientIdSetting.get();
  if (auth0ClientId) {
    passport.use(
      new Auth0Strategy(
        {
          clientID: auth0ClientIdSetting.get(),
          clientSecret: auth0OAuthSecretSetting.get(),
          domain: auth0DomainSetting.get(),
          callbackURL: `${getSiteUrl()}auth/auth0/callback`,
          proxy: true
        },
        createOAuthUserHandler('services.auth0.id', profile => profile.id, profile => {
          delete profile._json
          return {
            email: profile.emails[0].value,
            services: {
              auth0: profile
            },
            username: /* await */ Utils.getUnusedSlugByCollectionName("Users", slugify(profile.displayName)),
            displayName: profile.displayName,
            emailSubscribedToCurated: true
          }
        })
      )
    );
  }

  const githubClientId = githubClientIdSetting.get()
  if (githubClientId) {
    passport.use(new GithubOAuthStrategy({
      clientID: githubClientId,
      clientSecret: githubOAuthSecretSetting.get(),
      callbackURL: `${getSiteUrl()}auth/github/callback`,
      scope: [ 'user:email' ], // fetches non-public emails as well
    },
      createOAuthUserHandler('services.github.id', profile => profile.id, profile => ({
        email: profile.emails[0].value,
        services: {
          github: profile
        },
        username: Utils.getUnusedSlugByCollectionName("Users", slugify(profile.username)),
        displayName: profile.username || profile.displayName,
        emailSubscribedToCurated: true
      }))
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
