import mixin from 'bot-api-js-client'

class Client {

  request(method, path, data, callback) {
    data = data || '';
    let uid = process.env.VUE_APP_CLIENT_ID
    let sid = process.env.VUE_APP_SESSION_ID
    let privateKey = process.env.VUE_APP_PRIVATE_KEY
    return mixin.client.request(uid, sid, privateKey, method, path, data, callback)
  }

  requestByToken(method, path, data, accessToken, callback) {
    return mixin.client.requestByToken(method, path, data, accessToken, callback).then((resp) => {
      let consumed = false;
      if (typeof callback === 'function') {
        consumed = callback(resp);
      }

      if (!consumed) {
        if (resp && resp.error) {
          let clientId = process.env.VUE_APP_CLIENT_ID
          switch (resp.error.code) {
            case 401:
              window.location.replace(`https://mixin.one/oauth/authorize?client_id=${clientId}&scope=PROFILE:READ+ASSETS:READ+CONTACTS:READ&response_type=code&code_challenge=`+mixin.util.challenge());
              break;
          }
        }
      }

      return resp
    })
  }
}

export default Client
