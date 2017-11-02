import * as web from 'express-decorators';
import utils from '@/libs/utils';
import sanitizers from '@/libs/sanitizers';
import credential from '@/libs/credential';
import permissions from '@/libs/permissions';

const DIRECTORY_COOKIE = 'iPlanetDirectoryPro';

@web.controller('/')
export default class Handler {

  @web.get('/login')
  async getLoginAction(req, res) {
    res.render('login', {
      page_title: 'Sign In',
    });
  }

  @web.post('/login')
  @web.middleware(utils.sanitizeBody({
    username: sanitizers.nonEmptyString(),
    password: sanitizers.nonEmptyString(),
  }))
  async postLoginAction(req, res) {
    const user = await DI.models.User.authenticateAsync(req.data.username, req.data.password);
    await credential.setCredential(req, user._id);
    res.redirect(utils.url('/'));
  }

  @web.post('/logout')
  @web.middleware(utils.checkPermission(permissions.PROFILE))
  async postLogoutAction(req, res) {
    req.session.destroy();
    res.clearCookie(DIRECTORY_COOKIE, { domain: '.tongji.edu.cn' });
    res.redirect(utils.url('/'));
  }

}
